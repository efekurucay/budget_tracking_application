-- Create group transactions table
CREATE TABLE IF NOT EXISTS public.group_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  date DATE NOT NULL,
  is_expense BOOLEAN NOT NULL DEFAULT TRUE,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Group transaction members table
CREATE TABLE IF NOT EXISTS public.group_transaction_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.group_transactions(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(transaction_id, member_id)
);

-- Add basic RLS policies
ALTER TABLE public.group_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_transaction_members ENABLE ROW LEVEL SECURITY;

-- Clear existing policies
DROP POLICY IF EXISTS "Group members can view group transactions" ON public.group_transactions;
DROP POLICY IF EXISTS "Group members can view transaction participants" ON public.group_transaction_members;
DROP POLICY IF EXISTS "Group members can add transactions" ON public.group_transactions;
DROP POLICY IF EXISTS "Group members can add transaction participants" ON public.group_transaction_members;
DROP POLICY IF EXISTS "Group members can update their own transactions" ON public.group_transactions;
DROP POLICY IF EXISTS "Users can delete their own transactions or owners can delete all" ON public.group_transactions;
DROP POLICY IF EXISTS "Transaction owner or group owners can delete participants" ON public.group_transaction_members;

-- Group members can view transactions in their groups
CREATE POLICY "Group members can view group transactions" 
  ON public.group_transactions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_transactions.group_id
    AND group_members.user_id = auth.uid()
  ));

-- Group members can view transaction participants
CREATE POLICY "Group members can view transaction participants" 
  ON public.group_transaction_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.group_transactions
    JOIN public.group_members 
    ON group_members.group_id = group_transactions.group_id
    WHERE group_transactions.id = group_transaction_members.transaction_id
    AND group_members.user_id = auth.uid()
  ));

-- Group members can add transactions to their groups
CREATE POLICY "Group members can add transactions" 
  ON public.group_transactions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_transactions.group_id
      AND group_members.user_id = auth.uid()
    )
    AND auth.uid() = user_id
  );

-- Group members can add transaction participants
CREATE POLICY "Group members can add transaction participants" 
  ON public.group_transaction_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_transactions
      JOIN public.group_members 
      ON group_members.group_id = group_transactions.group_id
      WHERE group_transactions.id = group_transaction_members.transaction_id
      AND group_members.user_id = auth.uid()
      AND (group_transactions.user_id = auth.uid() OR group_members.role = 'owner')
    )
  );

-- Group members can update their own transactions
CREATE POLICY "Group members can update their own transactions" 
  ON public.group_transactions FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own transactions, or group owners can delete any
CREATE POLICY "Users can delete their own transactions or owners can delete all" 
  ON public.group_transactions FOR DELETE
  USING (
    auth.uid() = user_id 
    OR EXISTS (
      SELECT 1 FROM public.group_members
      WHERE group_members.group_id = group_transactions.group_id
      AND group_members.user_id = auth.uid()
      AND group_members.role = 'owner'
    )
  );

-- Transaction creators or group owners can delete participants
CREATE POLICY "Transaction owner or group owners can delete participants" 
  ON public.group_transaction_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.group_transactions 
      JOIN public.group_members 
      ON group_members.group_id = group_transactions.group_id
      WHERE group_transactions.id = group_transaction_members.transaction_id
      AND (
        group_transactions.user_id = auth.uid() OR 
        (group_members.user_id = auth.uid() AND group_members.role = 'owner')
      )
    )
  );

-- RPC Functions
-- Clear existing functions
DROP FUNCTION IF EXISTS public.get_group_transactions(UUID);
DROP FUNCTION IF EXISTS public.get_transaction_members(UUID);
DROP FUNCTION IF EXISTS public.add_group_transaction(UUID, UUID, NUMERIC, TEXT, DATE, BOOLEAN, TEXT, UUID[]);

-- Function to get group transactions
CREATE OR REPLACE FUNCTION public.get_group_transactions(group_id_param UUID)
RETURNS SETOF public.group_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if calling user has access to this group
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_id_param
    AND group_members.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You do not have access to this group';
  END IF;

  -- Return transactions
  RETURN QUERY
  SELECT * FROM public.group_transactions
  WHERE group_id = group_id_param
  ORDER BY date DESC, created_at DESC;
END;
$$;

-- Function to get transaction members
CREATE OR REPLACE FUNCTION public.get_transaction_members(transaction_id_param UUID)
RETURNS TABLE(
  id UUID, 
  transaction_id UUID, 
  member_id UUID, 
  created_at TIMESTAMPTZ,
  first_name TEXT,
  last_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if calling user has access to this transaction
  IF NOT EXISTS (
    SELECT 1 
    FROM public.group_transactions gt
    JOIN public.group_members gm ON gm.group_id = gt.group_id
    WHERE gt.id = transaction_id_param
    AND gm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You do not have access to this transaction';
  END IF;

  -- Return participants and profile information
  RETURN QUERY
  SELECT 
    gtm.id, 
    gtm.transaction_id, 
    gtm.member_id, 
    gtm.created_at,
    p.first_name,
    p.last_name
  FROM 
    public.group_transaction_members gtm
  LEFT JOIN
    public.profiles p ON p.id = gtm.member_id
  WHERE 
    gtm.transaction_id = transaction_id_param;
END;
$$;

-- Secure function to add a group transaction
CREATE OR REPLACE FUNCTION public.add_group_transaction(
  p_group_id UUID,
  p_user_id UUID,
  p_amount NUMERIC,
  p_description TEXT,
  p_date DATE,
  p_is_expense BOOLEAN DEFAULT TRUE,
  p_category TEXT DEFAULT NULL,
  p_member_ids UUID[] DEFAULT NULL
)
RETURNS public.group_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_transaction public.group_transactions;
  v_member_id UUID;
BEGIN
  -- Verify user is creating transaction for themselves
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'You can only add transactions for yourself';
  END IF;

  -- Check that user is a member of the group
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = p_group_id
    AND group_members.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You must be a member of this group';
  END IF;

  -- Validate amount
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Transaction amount must be greater than zero';
  END IF;

  -- Add the transaction
  INSERT INTO public.group_transactions (
    group_id,
    user_id,
    amount,
    description,
    date,
    is_expense,
    category
  ) VALUES (
    p_group_id,
    p_user_id,
    p_amount,
    p_description,
    p_date,
    p_is_expense,
    p_category
  )
  RETURNING * INTO v_new_transaction;
  
  -- If participants specified, add them
  IF p_member_ids IS NOT NULL AND array_length(p_member_ids, 1) > 0 THEN
    FOREACH v_member_id IN ARRAY p_member_ids
    LOOP
      -- Check that member is in the group
      IF EXISTS (
        SELECT 1 FROM public.group_members
        WHERE group_members.group_id = p_group_id
        AND group_members.user_id = v_member_id
      ) THEN
        -- Insert the member
        INSERT INTO public.group_transaction_members (transaction_id, member_id)
        VALUES (v_new_transaction.id, v_member_id);
      ELSE
        RAISE WARNING 'Member % is not in the group, skipping', v_member_id;
      END IF;
    END LOOP;
  END IF;

  RETURN v_new_transaction;
END;
$$;

-- Function to calculate group settlements (who owes whom)
CREATE OR REPLACE FUNCTION public.calculate_group_settlement(group_id_param UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Çağıran kullanıcının bu gruba erişimi olup olmadığını kontrol edin
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_id_param
    AND group_members.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Bu gruba erişiminiz yok';
  END IF;

  -- Basit debug için log ekleyin
  RAISE NOTICE 'Grup hesaplaşması hesaplanıyor: %', group_id_param;

  -- Güncellenmiş hesaplaşma sorgusu - daha basitleştirilmiş
  WITH expense_payments AS (
    -- Her bir harcama için kim ödedi
    SELECT 
      gt.user_id AS payer_id,
      gt.amount,
      gt.id AS transaction_id
    FROM 
      public.group_transactions gt
    WHERE 
      gt.group_id = group_id_param
      AND gt.is_expense = TRUE
  ),
  expense_shares AS (
    -- Her bir harcamanın kimlere paylaştırıldığı  
    SELECT 
      ep.transaction_id,
      ep.payer_id,
      gtm.member_id AS beneficiary_id,
      ep.amount,
      ep.amount / COUNT(*) OVER (PARTITION BY ep.transaction_id) AS share_amount
    FROM 
      expense_payments ep
    JOIN 
      public.group_transaction_members gtm ON ep.transaction_id = gtm.transaction_id
  ),
  user_balances AS (
    -- Kullanıcı bazında ödenen ve borçlu olunan miktarlar
    SELECT
      u.user_id,
      COALESCE(SUM(CASE WHEN u.user_id = es.payer_id THEN es.amount ELSE 0 END), 0) AS paid_total,
      COALESCE(SUM(CASE WHEN u.user_id = es.beneficiary_id THEN es.share_amount ELSE 0 END), 0) AS owed_total
    FROM
      (SELECT DISTINCT user_id FROM public.group_members WHERE group_id = group_id_param) u
    LEFT JOIN
      expense_shares es ON (u.user_id = es.payer_id OR u.user_id = es.beneficiary_id)
    GROUP BY
      u.user_id
  ),
  net_balances AS (
    -- Net bakiyeler (pozitif: alacaklı, negatif: borçlu)
    SELECT
      user_id,
      paid_total - owed_total AS balance
    FROM
      user_balances
  ),
  debts AS (
    -- Kimin kime ne kadar ödeyeceği
    SELECT
      debtors.user_id AS from_user_id,
      creditors.user_id AS to_user_id,
      LEAST(ABS(debtors.balance), creditors.balance) AS amount
    FROM
      (SELECT user_id, balance FROM net_balances WHERE balance < 0) debtors
    CROSS JOIN
      (SELECT user_id, balance FROM net_balances WHERE balance > 0) creditors
    WHERE 
      ABS(debtors.balance) > 0 AND creditors.balance > 0
    ORDER BY
      ABS(debtors.balance) DESC, creditors.balance DESC
  )
  
  -- JSON sonucunu formatlama
  SELECT
    COALESCE(
      json_agg(
        json_build_object(
          'from_user_id', d.from_user_id,
          'to_user_id', d.to_user_id,
          'amount', ROUND(d.amount::numeric, 2),
          'from_user_name', COALESCE(p1.first_name || ' ' || p1.last_name, 'Kullanıcı ' || d.from_user_id),
          'to_user_name', COALESCE(p2.first_name || ' ' || p2.last_name, 'Kullanıcı ' || d.to_user_id)
        )
      ),
      '[]'::JSON
    ) INTO v_result
  FROM
    debts d
  LEFT JOIN
    profiles p1 ON d.from_user_id = p1.id
  LEFT JOIN
    profiles p2 ON d.to_user_id = p2.id;

  -- Debug için sonucu kaydedin
  RAISE NOTICE 'Hesaplaşma sonucu: %', v_result;
  
  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;
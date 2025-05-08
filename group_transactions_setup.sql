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
  -- Check if calling user has access to this group
  IF NOT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_members.group_id = group_id_param
    AND group_members.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You do not have access to this group';
  END IF;

  -- Calculate settlements
  WITH transaction_shares AS (
    -- Calculate each expense share for every transaction
    SELECT 
      gt.id AS transaction_id,
      gt.user_id AS payer_id,
      gtm.member_id AS beneficiary_id,
      gt.amount,
      (gt.amount / COUNT(*) OVER (PARTITION BY gt.id)) AS share_amount
    FROM 
      public.group_transactions gt
    JOIN 
      public.group_transaction_members gtm ON gt.id = gtm.transaction_id
    WHERE 
      gt.group_id = group_id_param
      AND gt.is_expense = TRUE
  ),
  user_balances AS (
    -- Calculate how much each user paid vs. how much they owe
    SELECT
      user_id,
      SUM(CASE WHEN user_id = payer_id THEN amount ELSE 0 END) AS paid_amount,
      SUM(CASE WHEN user_id = beneficiary_id THEN share_amount ELSE 0 END) AS owed_amount
    FROM (
      -- Combine users who paid and beneficiaries into one list
      SELECT DISTINCT payer_id AS user_id FROM transaction_shares
      UNION
      SELECT DISTINCT beneficiary_id FROM transaction_shares
    ) users
    CROSS JOIN transaction_shares
    GROUP BY user_id
  ),
  net_balances AS (
    -- Calculate net balance for each user
    SELECT
      user_id,
      paid_amount - owed_amount AS net_balance
    FROM
      user_balances
  ),
  creditors AS (
    -- Users with positive balance (they paid more than their share)
    SELECT user_id, net_balance
    FROM net_balances
    WHERE net_balance > 0
    ORDER BY net_balance DESC
  ),
  debtors AS (
    -- Users with negative balance (they owe money)
    SELECT user_id, ABS(net_balance) AS debt
    FROM net_balances
    WHERE net_balance < 0
    ORDER BY net_balance ASC
  ),
  settlements AS (
    -- Calculate who pays whom
    WITH RECURSIVE settlement_calc(creditor_id, creditor_balance, debtor_id, debtor_balance, amount) AS (
      -- Start with the highest creditor and highest debtor
      SELECT 
        c.user_id, 
        c.net_balance, 
        d.user_id, 
        d.debt,
        LEAST(c.net_balance, d.debt)
      FROM 
        creditors c,
        debtors d
      WHERE c.user_id = (SELECT user_id FROM creditors ORDER BY net_balance DESC LIMIT 1)
        AND d.user_id = (SELECT user_id FROM debtors ORDER BY debt DESC LIMIT 1)
      
      UNION ALL
      
      -- Continue with remaining balances
      SELECT
        -- Keep or update creditor
        CASE
          WHEN s.creditor_balance - s.amount > 0 THEN s.creditor_id
          ELSE (SELECT user_id FROM creditors c WHERE c.user_id > s.creditor_id ORDER BY user_id LIMIT 1)
        END,
        CASE
          WHEN s.creditor_balance - s.amount > 0 THEN s.creditor_balance - s.amount
          ELSE (SELECT net_balance FROM creditors c WHERE c.user_id > s.creditor_id ORDER BY user_id LIMIT 1)
        END,
        -- Keep or update debtor
        CASE
          WHEN s.debtor_balance - s.amount > 0 THEN s.debtor_id
          ELSE (SELECT user_id FROM debtors d WHERE d.user_id > s.debtor_id ORDER BY user_id LIMIT 1)
        END,
        CASE
          WHEN s.debtor_balance - s.amount > 0 THEN s.debtor_balance - s.amount
          ELSE (SELECT debt FROM debtors d WHERE d.user_id > s.debtor_id ORDER BY user_id LIMIT 1)
        END,
        LEAST(
          CASE
            WHEN s.creditor_balance - s.amount > 0 THEN s.creditor_balance - s.amount
            ELSE (SELECT net_balance FROM creditors c WHERE c.user_id > s.creditor_id ORDER BY user_id LIMIT 1)
          END,
          CASE
            WHEN s.debtor_balance - s.amount > 0 THEN s.debtor_balance - s.amount
            ELSE (SELECT debt FROM debtors d WHERE d.user_id > s.debtor_id ORDER BY user_id LIMIT 1)
          END
        )
      FROM settlement_calc s
      WHERE (s.creditor_balance - s.amount > 0 OR EXISTS (SELECT 1 FROM creditors c WHERE c.user_id > s.creditor_id))
        AND (s.debtor_balance - s.amount > 0 OR EXISTS (SELECT 1 FROM debtors d WHERE d.user_id > s.debtor_id))
    )
    SELECT 
      sc.debtor_id AS from_user_id,
      sc.creditor_id AS to_user_id,
      sc.amount
    FROM 
      settlement_calc sc
    WHERE 
      sc.amount > 0
  )
  
  -- Format the result as JSON
  SELECT 
    json_agg(
      json_build_object(
        'from_user_id', s.from_user_id,
        'to_user_id', s.to_user_id,
        'amount', ROUND(s.amount::numeric, 2),
        'from_user_name', COALESCE(p1.first_name || ' ' || p1.last_name, 'User ' || s.from_user_id),
        'to_user_name', COALESCE(p2.first_name || ' ' || p2.last_name, 'User ' || s.to_user_id)
      )
    ) INTO v_result
  FROM 
    settlements s
  LEFT JOIN
    profiles p1 ON s.from_user_id = p1.id
  LEFT JOIN
    profiles p2 ON s.to_user_id = p2.id;

  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;
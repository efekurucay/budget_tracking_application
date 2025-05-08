| table_name                  | column_name     | data_type                | is_nullable | column_default               |
| --------------------------- | --------------- | ------------------------ | ----------- | ---------------------------- |
| admin_upgrade_requests_view | id              | uuid                     | YES         | null                         |
| admin_upgrade_requests_view | user_id         | uuid                     | YES         | null                         |
| admin_upgrade_requests_view | status          | text                     | YES         | null                         |
| admin_upgrade_requests_view | notes           | text                     | YES         | null                         |
| admin_upgrade_requests_view | created_at      | timestamp with time zone | YES         | null                         |
| admin_upgrade_requests_view | approved_by     | uuid                     | YES         | null                         |
| admin_upgrade_requests_view | approved_at     | timestamp with time zone | YES         | null                         |
| admin_upgrade_requests_view | first_name      | text                     | YES         | null                         |
| admin_upgrade_requests_view | last_name       | text                     | YES         | null                         |
| admin_upgrade_requests_view | is_already_pro  | boolean                  | YES         | null                         |
| ai_conversations            | id              | uuid                     | NO          | gen_random_uuid()            |
| ai_conversations            | user_id         | uuid                     | NO          | null                         |
| ai_conversations            | title           | text                     | NO          | null                         |
| ai_conversations            | created_at      | timestamp with time zone | NO          | now()                        |
| ai_conversations            | updated_at      | timestamp with time zone | NO          | now()                        |
| ai_messages                 | id              | uuid                     | NO          | gen_random_uuid()            |
| ai_messages                 | conversation_id | uuid                     | NO          | null                         |
| ai_messages                 | role            | text                     | NO          | null                         |
| ai_messages                 | content         | text                     | NO          | null                         |
| ai_messages                 | timestamp       | timestamp with time zone | NO          | now()                        |
| ai_messages                 | visual_data     | jsonb                    | YES         | null                         |
| badges                      | id              | uuid                     | NO          | gen_random_uuid()            |
| badges                      | name            | text                     | NO          | null                         |
| badges                      | description     | text                     | YES         | null                         |
| badges                      | icon            | text                     | YES         | null                         |
| badges                      | points          | integer                  | NO          | 10                           |
| badges                      | created_at      | timestamp with time zone | NO          | now()                        |
| badges                      | condition_type  | text                     | NO          | null                         |
| badges                      | condition_value | integer                  | NO          | null                         |
| badges                      | is_secret       | boolean                  | NO          | false                        |
| budget_categories           | id              | uuid                     | NO          | gen_random_uuid()            |
| budget_categories           | user_id         | uuid                     | NO          | null                         |
| budget_categories           | name            | text                     | NO          | null                         |
| budget_categories           | budget_amount   | numeric                  | NO          | null                         |
| budget_categories           | color           | text                     | YES         | null                         |
| budget_categories           | created_at      | timestamp with time zone | NO          | now()                        |
| goals                       | id              | uuid                     | NO          | gen_random_uuid()            |
| goals                       | user_id         | uuid                     | NO          | null                         |
| goals                       | name            | text                     | NO          | null                         |
| goals                       | target_amount   | numeric                  | NO          | null                         |
| goals                       | current_amount  | numeric                  | YES         | 0                            |
| goals                       | completed_at    | timestamp with time zone | YES         | null                         |
| goals                       | created_at      | timestamp with time zone | NO          | now()                        |
| goals                       | updated_at      | timestamp with time zone | NO          | now()                        |
| group_invites               | id              | uuid                     | NO          | gen_random_uuid()            |
| group_invites               | group_id        | uuid                     | NO          | null                         |
| group_invites               | invited_by      | uuid                     | NO          | null                         |
| group_invites               | email           | text                     | NO          | null                         |
| group_invites               | invitation_code | text                     | NO          | null                         |
| group_invites               | status          | text                     | NO          | null                         |
| group_invites               | created_at      | timestamp with time zone | NO          | now()                        |
| group_invites               | updated_at      | timestamp with time zone | NO          | now()                        |
| group_invites               | expires_at      | timestamp with time zone | NO          | (now() + '7 days'::interval) |
| group_members               | id              | uuid                     | NO          | gen_random_uuid()            |
| group_members               | group_id        | uuid                     | NO          | null                         |
| group_members               | user_id         | uuid                     | NO          | null                         |
| group_members               | role            | text                     | NO          | null                         |
| group_members               | joined_at       | timestamp with time zone | NO          | now()                        |
| group_transaction_members   | id              | uuid                     | NO          | gen_random_uuid()            |
| group_transaction_members   | transaction_id  | uuid                     | NO          | null                         |
| group_transaction_members   | member_id       | uuid                     | NO          | null                         |
| group_transaction_members   | created_at      | timestamp with time zone | NO          | now()                        |
| group_transactions          | id              | uuid                     | NO          | gen_random_uuid()            |
| group_transactions          | group_id        | uuid                     | NO          | null                         |
| group_transactions          | user_id         | uuid                     | NO          | null                         |
| group_transactions          | amount          | numeric                  | NO          | null                         |
| group_transactions          | description     | text                     | NO          | null                         |
| group_transactions          | date            | date                     | NO          | null                         |
| group_transactions          | is_expense      | boolean                  | NO          | true                         |
| group_transactions          | category        | text                     | YES         | null                         |
| group_transactions          | created_at      | timestamp with time zone | NO          | now()                        |
| groups                      | id              | uuid                     | NO          | gen_random_uuid()            |
| groups                      | name            | text                     | NO          | null                         |
| groups                      | description     | text                     | YES         | null                         |
| groups                      | created_by      | uuid                     | YES         | null                         |
| groups                      | created_at      | timestamp with time zone | NO          | now()                        |
| notifications               | id              | uuid                     | NO          | gen_random_uuid()            |
| notifications               | user_id         | uuid                     | NO          | null                         |
| notifications               | type            | text                     | NO          | null                         |
| notifications               | title           | text                     | NO          | null                         |
| notifications               | message         | text                     | NO          | null                         |
| notifications               | read            | boolean                  | NO          | false                        |
| notifications               | created_at      | timestamp with time zone | NO          | now()                        |
| profiles                    | id              | uuid                     | NO          | null                         |
| profiles                    | first_name      | text                     | YES         | null                         |
| profiles                    | last_name       | text                     | YES         | null                         |
| profiles                    | is_pro          | boolean                  | YES         | false                        |
| profiles                    | points          | integer                  | YES         | 0                            |
| profiles                    | is_admin        | boolean                  | YES         | false                        |
| profiles                    | created_at      | timestamp with time zone | NO          | now()                        |
| profiles                    | updated_at      | timestamp with time zone | NO          | now()                        |
| showcase                    | id              | uuid                     | NO          | gen_random_uuid()            |
| showcase                    | user_id         | uuid                     | NO          | null                         |
| showcase                    | content         | text                     | NO          | null                         |
| showcase                    | badge_id        | uuid                     | YES         | null                         |
| showcase                    | goal_id         | uuid                     | YES         | null                         |
| showcase                    | created_at      | timestamp with time zone | NO          | now()                        |
| subscriptions               | id              | uuid                     | NO          | gen_random_uuid()            |
| subscriptions               | user_id         | uuid                     | NO          | null                         |
| subscriptions               | status          | text                     | NO          | null                         |
| subscriptions               | created_at      | timestamp with time zone | NO          | now()                        |
| subscriptions               | expires_at      | timestamp with time zone | YES         | null                         |
| subscriptions               | points_used     | integer                  | YES         | 0                            |
| transactions                | id              | uuid                     | NO          | gen_random_uuid()            |
| transactions                | user_id         | uuid                     | NO          | null                         |
| transactions                | amount          | numeric                  | NO          | null                         |
| transactions                | type            | text                     | NO          | null                         |
| transactions                | category        | text                     | YES         | null                         |
| transactions                | description     | text                     | YES         | null                         |
| transactions                | date            | timestamp with time zone | NO          | now()                        |
| transactions                | created_at      | timestamp with time zone | NO          | now()                        |
| upgrade_requests            | id              | uuid                     | NO          | gen_random_uuid()            |
| upgrade_requests            | user_id         | uuid                     | NO          | null                         |
| upgrade_requests            | status          | text                     | NO          | null                         |
| upgrade_requests            | notes           | text                     | YES         | null                         |
| upgrade_requests            | created_at      | timestamp with time zone | NO          | now()                        |
| upgrade_requests            | approved_by     | uuid                     | YES         | null                         |
| upgrade_requests            | approved_at     | timestamp with time zone | YES         | null                         |
| user_badges                 | id              | uuid                     | NO          | gen_random_uuid()            |
| user_badges                 | user_id         | uuid                     | NO          | null                         |
| user_badges                 | badge_id        | uuid                     | NO          | null                         |
| user_badges                 | earned_at       | timestamp with time zone | NO          | now()                        |
| user_badges                 | is_public       | boolean                  | NO          | true                         |

---

| table_name                | column_name     | constraint_type |
| ------------------------- | --------------- | --------------- |
| ai_conversations          | id              | PRIMARY KEY     |
| ai_messages               | id              | PRIMARY KEY     |
| badges                    | id              | PRIMARY KEY     |
| budget_categories         | id              | PRIMARY KEY     |
| goals                     | id              | PRIMARY KEY     |
| group_invites             | id              | PRIMARY KEY     |
| group_invites             | invitation_code | UNIQUE          |
| group_members             | id              | PRIMARY KEY     |
| group_members             | user_id         | UNIQUE          |
| group_members             | group_id        | UNIQUE          |
| group_transaction_members | id              | PRIMARY KEY     |
| group_transaction_members | member_id       | UNIQUE          |
| group_transaction_members | transaction_id  | UNIQUE          |
| group_transactions        | id              | PRIMARY KEY     |
| groups                    | id              | PRIMARY KEY     |
| notifications             | id              | PRIMARY KEY     |
| profiles                  | id              | PRIMARY KEY     |
| showcase                  | id              | PRIMARY KEY     |
| subscriptions             | id              | PRIMARY KEY     |
| transactions              | id              | PRIMARY KEY     |
| upgrade_requests          | id              | PRIMARY KEY     |
| user_badges               | badge_id        | UNIQUE          |
| user_badges               | user_id         | UNIQUE          |
| user_badges               | id              | PRIMARY KEY     |


---


| foreign_table             | foreign_column  | primary_table      | primary_column |
| ------------------------- | --------------- | ------------------ | -------------- |
| user_badges               | badge_id        | badges             | id             |
| group_members             | group_id        | groups             | id             |
| group_transactions        | group_id        | groups             | id             |
| group_transaction_members | transaction_id  | group_transactions | id             |
| ai_messages               | conversation_id | ai_conversations   | id             |
| group_invites             | group_id        | groups             | id             |
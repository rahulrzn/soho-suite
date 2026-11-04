CREATE TABLE business_health_input (
    id BIGSERIAL PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES business(id) ON DELETE CASCADE,
    period_from DATE NOT NULL,
    period_to DATE NOT NULL,
    currency VARCHAR(3) NOT NULL,
    cash_balance NUMERIC(19, 4) NOT NULL CHECK (cash_balance >= 0),
    inventory_value NUMERIC(19, 4) NOT NULL CHECK (inventory_value >= 0),
    cost_of_goods_sold NUMERIC(19, 4) NOT NULL CHECK (cost_of_goods_sold >= 0),
    updated_by BIGINT NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT business_health_input_range CHECK (period_to >= period_from AND period_to - period_from <= 365),
    CONSTRAINT business_health_input_period_unique UNIQUE (business_id, period_from, period_to)
);

CREATE INDEX business_health_input_latest_idx ON business_health_input (business_id, period_to DESC);

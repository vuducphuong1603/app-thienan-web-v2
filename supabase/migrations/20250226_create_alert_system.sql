-- ============================================
-- Alert System Tables
-- ============================================

-- Table: alert_rules
CREATE TABLE alert_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('attendance', 'score', 'system')),
  severity VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (severity IN ('high', 'medium', 'low')),
  threshold NUMERIC DEFAULT 0,
  conditions JSONB NOT NULL DEFAULT '[]',
  condition_expression TEXT,
  notification_types TEXT[] DEFAULT ARRAY['system'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: alerts
CREATE TABLE alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID REFERENCES alert_rules(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('attendance', 'score', 'system')),
  severity VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (severity IN ('high', 'medium', 'low')),
  status VARCHAR(20) NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'resolved', 'dismissed')),
  student_id UUID,
  student_name TEXT,
  student_code TEXT,
  class_id UUID,
  class_name TEXT,
  source TEXT DEFAULT 'rule_engine',
  metadata JSONB DEFAULT '{}',
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_type ON alerts(type);
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC);
CREATE INDEX idx_alert_rules_is_active ON alert_rules(is_active);

-- ============================================
-- RLS Policies
-- ============================================

-- alert_rules
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read alert_rules"
  ON alert_rules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create alert_rules"
  ON alert_rules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update alert_rules"
  ON alert_rules FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete alert_rules"
  ON alert_rules FOR DELETE
  TO authenticated
  USING (true);

-- alerts
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create alerts"
  ON alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update alerts"
  ON alerts FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete alerts"
  ON alerts FOR DELETE
  TO authenticated
  USING (true);

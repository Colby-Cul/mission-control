import { Card } from '../components/shared';
import { C } from '../data/constants';

const DocsHub = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Docs Hub</h1>
      <Card>
        <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
          Docs Hub implementation coming soon...
        </div>
      </Card>
    </div>
  );
};

export default DocsHub;

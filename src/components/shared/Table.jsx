import { C } from '../../data/constants';

const Table = ({ columns, rows }) => (
  <div style={{ overflowX: "auto", borderRadius: 8, border: `1px solid ${C.border}` }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead>
        <tr style={{ background: C.surface }}>
          {columns.map((col, i) => (
            <th key={i} style={{ 
              padding: "10px 12px", 
              textAlign: "left", 
              color: C.muted, 
              fontWeight: 600, 
              borderBottom: `1px solid ${C.border}`, 
              whiteSpace: "nowrap" 
            }}>
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
            {row.map((cell, j) => (
              <td key={j} style={{ 
                padding: "10px 12px", 
                color: C.text, 
                verticalAlign: "middle" 
              }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default Table;
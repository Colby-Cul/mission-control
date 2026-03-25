import { C } from '../../data/constants';

const PriorityDot = ({ priority }) => {
  const colors = { critical: C.red, high: C.amber, medium: C.accent, low: C.muted };
  return (
    <span style={{ 
      width: 8, 
      height: 8, 
      borderRadius: "50%", 
      background: colors[priority] || C.muted, 
      display: "inline-block" 
    }} />
  );
};

export default PriorityDot;
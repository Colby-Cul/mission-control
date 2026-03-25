import { C } from '../../data/constants';

const Section = ({ children }) => (
  <h3 style={{ 
    fontSize: 15, 
    fontWeight: 600, 
    color: C.muted, 
    margin: "24px 0 12px 0", 
    textTransform: "uppercase", 
    letterSpacing: 1 
  }}>
    {children}
  </h3>
);

export default Section;
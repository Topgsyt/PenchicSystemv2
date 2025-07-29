import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

interface ParallaxSectionProps {
  children: React.ReactNode;
  offset?: number;
  className?: string;
}

const ParallaxSection: React.FC<ParallaxSectionProps> = ({
  children,
  offset = 50,
  className = '',
}) => {
  const { scrollY } = useScroll();
  const ref = React.useRef<HTMLDivElement>(null);
  const [elementTop, setElementTop] = React.useState(0);

  React.useEffect(() => {
    if (ref.current) {
      setElementTop(ref.current.offsetTop);
    }
  }, []);

  const y = useTransform(
    scrollY,
    [elementTop - 500, elementTop + 500],
    [-offset, offset]
  );

  return (
    <motion.div
      ref={ref}
      style={{ y }}
      className={`will-change-transform ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default ParallaxSection;
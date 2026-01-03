import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  className?: string;
  formatFn?: (value: number) => string;
}

export function AnimatedNumber({ 
  value, 
  duration = 0.8, 
  className = "",
  formatFn = (v) => v.toLocaleString()
}: AnimatedNumberProps) {
  const spring = useSpring(0, { 
    duration: duration * 1000,
    bounce: 0
  });
  
  const display = useTransform(spring, (current) => formatFn(Math.round(current)));
  const [displayValue, setDisplayValue] = useState(formatFn(0));

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => {
      setDisplayValue(v);
    });
    return unsubscribe;
  }, [display]);

  return (
    <motion.span 
      className={className}
      key={value}
      initial={{ opacity: 0.7, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {displayValue}
    </motion.span>
  );
}

interface AnimatedPercentageProps {
  value: number;
  duration?: number;
  className?: string;
  decimals?: number;
}

export function AnimatedPercentage({ 
  value, 
  duration = 0.8, 
  className = "",
  decimals = 1
}: AnimatedPercentageProps) {
  const spring = useSpring(0, { 
    duration: duration * 1000,
    bounce: 0
  });
  
  const display = useTransform(spring, (current) => `${current.toFixed(decimals)}%`);
  const [displayValue, setDisplayValue] = useState("0%");

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  useEffect(() => {
    const unsubscribe = display.on("change", (v) => {
      setDisplayValue(v);
    });
    return unsubscribe;
  }, [display]);

  return (
    <motion.span 
      className={className}
      key={value}
      initial={{ opacity: 0.7, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {displayValue}
    </motion.span>
  );
}

import { Pressable, type PressableProps, StyleSheet } from 'react-native';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { motion } from '@/theme/motion';

type Props = PressableProps & {
  scaleTo?: number;
};

export default function PressableScale({
  children,
  style,
  scaleTo = motion.pressScale,
  ...rest
}: Props) {
  const reduceMotion = useReducedMotion();

  return (
    <Pressable
      accessibilityRole="button"
      style={(state) => {
        const base = typeof style === 'function' ? style(state) : style;
        const pressed = state.pressed && !reduceMotion;
        return [base, pressed && { transform: [{ scale: scaleTo }] }];
      }}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

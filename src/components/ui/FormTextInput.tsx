import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

type Props = TextInputProps & {
  label: string;
  error?: string;
};

export const FormTextInput = forwardRef<TextInput, Props>(function FormTextInput(
  { label, error, ...props },
  ref,
) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = props.secureTextEntry === true;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, error ? styles.inputError : undefined]}>
        <TextInput
          ref={ref}
          {...props}
          placeholderTextColor="#a2abb0"
          secureTextEntry={isPassword ? !showPassword : props.secureTextEntry}
          style={styles.input}
        />
        {isPassword ? (
          <Pressable
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setShowPassword((visible) => !visible)}
            style={styles.eyeButton}
          >
            <EyeIcon hidden={!showPassword} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <View style={styles.eye}>
      <View style={styles.pupil} />
      {hidden ? <View style={styles.slash} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { color: '#54705d', fontSize: 10, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },
  inputShell: {
    backgroundColor: '#ffffff',
    borderColor: '#e1e2df',
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 48,
  },
  inputError: { borderColor: '#c85252' },
  input: {
    color: '#183a28',
    fontSize: 16,
    flex: 1,
    paddingHorizontal: 16,
  },
  eyeButton: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  eye: { alignItems: 'center', borderColor: '#60766a', borderRadius: 10, borderWidth: 1.5, height: 13, justifyContent: 'center', width: 21 },
  pupil: { backgroundColor: '#60766a', borderRadius: 3, height: 5, width: 5 },
  slash: { backgroundColor: '#60766a', height: 1.5, position: 'absolute', transform: [{ rotate: '-42deg' }], width: 25 },
  error: { color: '#b23c3c', fontSize: 12 },
});

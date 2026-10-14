import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { useAuth } from '../auth.context';
import { useVerifyOtp } from '../hooks/useVerifyOtp';
import { otpSchema, type OtpFormValues } from '../schemas/otp.schema';

export function OtpForm() {
  const router = useRouter();
  const { state } = useAuth();
  const mutation = useVerifyOtp();
  const inputRef = useRef<TextInput>(null);
  const [submittedCode, setSubmittedCode] = useState<string | undefined>();
  const { control, handleSubmit } = useForm<OtpFormValues>({ resolver: zodResolver(otpSchema), defaultValues: { code: '' } });

  useEffect(() => {
    if (!state.pendingOtp) router.replace('/(auth)/login' as Href);
  }, [router, state.pendingOtp]);

  const onSubmit = handleSubmit(({ code }) => {
    if (mutation.isPending || submittedCode === code) return;
    setSubmittedCode(code);
    mutation.mutate(code, {
      onSuccess: () => router.replace('/'),
      onError: () => setSubmittedCode(undefined),
    });
  });

  const code = useWatch({ control, name: 'code' });
  useEffect(() => {
    if (code?.length === 6 && submittedCode !== code) onSubmit();
  }, [code, onSubmit, submittedCode]);

  if (!state.pendingOtp) {
    return null;
  }

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="code"
        render={({ field, fieldState }) => {
          const displayedCode = field.value ?? '';
          const activeIndex = displayedCode.length < 6 ? displayedCode.length : -1;
          return (
            <View style={styles.field}>
              <Text style={styles.label}>Verification code</Text>
              <Pressable accessibilityLabel="Enter verification code" accessibilityRole="button" onPress={() => inputRef.current?.focus()} style={styles.codeShell}>
                {Array.from({ length: 6 }, (_, index) => <View key={index} style={[styles.codeBox, index === activeIndex ? styles.codeBoxActive : undefined, fieldState.error ? styles.codeBoxError : undefined]}><Text style={styles.codeText}>{displayedCode[index] ?? ''}</Text></View>)}
                <TextInput
                  ref={inputRef}
                  accessibilityLabel="Verification code input"
                  autoComplete="one-time-code"
                  autoFocus
                  keyboardType="number-pad"
                  maxLength={6}
                  onBlur={field.onBlur}
                  onChangeText={(value) => field.onChange(value.replace(/\D/g, '').slice(0, 6))}
                  style={styles.hiddenInput}
                  textContentType="oneTimeCode"
                  value={displayedCode}
                />
              </Pressable>
              {fieldState.error ? <Text style={styles.error}>{fieldState.error.message}</Text> : null}
            </View>
          );
        }}
      />
      <ErrorMessage message={mutation.error instanceof Error ? mutation.error.message : undefined} />
      <Button label="Continue" loading={mutation.isPending} onPress={onSubmit} />
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18 },
  field: { gap: 6 },
  label: { color: '#54705d', fontSize: 10, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },
  codeShell: { alignSelf: 'center', flexDirection: 'row', gap: 8, position: 'relative' },
  codeBox: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e1e2df', borderRadius: 8, borderWidth: 1, height: 48, justifyContent: 'center', width: 32 },
  codeBoxActive: { borderColor: '#087b45', borderWidth: 2 },
  codeBoxError: { borderColor: '#c85252' },
  codeText: { color: '#183a28', fontSize: 22, fontWeight: '600' },
  hiddenInput: { ...StyleSheet.absoluteFill, color: 'transparent', opacity: 0 },
  error: { color: '#b23c3c', fontSize: 12 },
  backButton: { alignItems: 'center', marginTop: 4 },
  backText: { color: '#315a43', fontSize: 14, fontWeight: '700' },
});

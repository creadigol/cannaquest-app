import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { CheckboxRow } from '@/components/ui/CheckboxRow';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { FormTextInput } from '@/components/ui/FormTextInput';
import { ApiRequestError } from '@/lib/api/api-error';
import { useAuth } from '../auth.context';
import { useLogin } from '../hooks/useLogin';
import { loginSchema, type LoginFormValues } from '../schemas/login.schema';

export function LoginForm() {
  const router = useRouter();
  const { setPendingOtp } = useAuth();
  const mutation = useLogin();
  const apiError = mutation.error instanceof ApiRequestError ? mutation.error : undefined;
  const invalidCredentials = apiError?.kind === 'invalid_credentials' ? apiError.message : undefined;
  const generalError = apiError && apiError.kind !== 'invalid_credentials' ? apiError.message : undefined;
  const [remember, setRemember] = useState(true);
  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate({ ...values, channel: 'email', remember }, {
      onSuccess: (result) => {
        setPendingOtp({ otpSessionId: result.otpSessionId, flow: 'login', email: values.email });
        router.push('/(auth)/verify-otp' as Href);
      },
    });
  });

  return (
    <View style={styles.form}>
      <Controller control={control} name="email" render={({ field, fieldState }) => <FormTextInput label="Email address" autoCapitalize="none" keyboardType="email-address" onBlur={field.onBlur} onChangeText={field.onChange} value={field.value} error={fieldState.error?.message} />} />
      <Controller control={control} name="password" render={({ field, fieldState }) => <FormTextInput label="Password" autoCapitalize="none" onBlur={field.onBlur} onChangeText={field.onChange} secureTextEntry value={field.value} error={fieldState.error?.message ?? invalidCredentials} />} />
      <Pressable onPress={() => undefined}>
        <Text style={styles.forgot}>Forgot password?</Text>
      </Pressable>
      <CheckboxRow checked={remember} label="Remember my login" onPress={() => setRemember((value) => !value)} />
      <ErrorMessage message={generalError} />
      <Button label="Sign In to Portal" loading={mutation.isPending} onPress={onSubmit} />
      <Text style={styles.note}>We’ll send a verification code to your email.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 13 },
  forgot: { color: '#067765', fontSize: 11, fontWeight: '800', marginTop: -3 },
  note: { color: '#718178', fontSize: 11, textAlign: 'center' },
});

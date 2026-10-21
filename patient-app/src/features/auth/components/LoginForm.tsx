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
import type { AuthChannel } from '../api/auth.types';
import { useLogin } from '../hooks/useLogin';
import { loginSchema, type LoginFormValues } from '../schemas/login.schema';

export function LoginForm() {
  const router = useRouter();
  const { setPendingOtp, setAuthenticatedSession } = useAuth();
  const mutation = useLogin();
  const apiError = mutation.error instanceof ApiRequestError ? mutation.error : undefined;
  const invalidCredentials = apiError?.kind === 'invalid_credentials' ? apiError.message : undefined;
  const generalError = apiError && apiError.kind !== 'invalid_credentials' ? apiError.message : undefined;
  const [remember, setRemember] = useState(true);
  const [channel, setChannel] = useState<AuthChannel>('email');

  const { control, handleSubmit } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', phone: '' },
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate(
      {
        email: values.email,
        password: values.password,
        phone: values.phone?.trim() ? values.phone.trim() : undefined,
        channel,
        remember,
      },
      {
        onSuccess: (result) => {
          if (!result.requiresOtp) {
            // User is exempt from OTP! Transition straight into authenticated Dashboard
            setAuthenticatedSession(result.session);
            router.replace('/(app)/(tabs)' as Href);
            return;
          }

          // User requires OTP: navigate to OTP verification screen with destination
          const targetContact =
            channel === 'sms'
              ? (values.phone?.trim() || result.destination || undefined)
              : (result.destination || values.email);

          setPendingOtp({
            otpSessionId: result.otpSessionId,
            flow: 'login',
            email: values.email,
            phone: values.phone?.trim() || undefined,
            channel,
            destination: targetContact,
            needsPhone: result.needsPhone,
          });
          router.push('/(auth)/verify-otp' as Href);
        },
      }
    );
  });

  return (
    <View style={styles.form}>
      <Controller
        control={control}
        name="email"
        render={({ field, fieldState }) => (
          <FormTextInput
            label="Email address"
            autoCapitalize="none"
            keyboardType="email-address"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field, fieldState }) => (
          <FormTextInput
            label="Password"
            autoCapitalize="none"
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            secureTextEntry
            value={field.value}
            error={fieldState.error?.message ?? invalidCredentials}
          />
        )}
      />

      <Pressable onPress={() => undefined}>
        <Text style={styles.forgot}>Forgot password?</Text>
      </Pressable>

      {/* Channel selector (Email vs SMS) */}
      <View style={styles.channelRow}>
        <Text style={styles.channelLabel}>Send OTP via:</Text>
        <View style={styles.channelOptions}>
          <Pressable
            onPress={() => setChannel('email')}
            style={[styles.channelChip, channel === 'email' && styles.channelChipActive]}
          >
            <Text style={[styles.channelChipText, channel === 'email' && styles.channelChipTextActive]}>
              Email
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setChannel('sms')}
            style={[styles.channelChip, channel === 'sms' && styles.channelChipActive]}
          >
            <Text style={[styles.channelChipText, channel === 'sms' && styles.channelChipTextActive]}>
              SMS
            </Text>
          </Pressable>
        </View>
      </View>

      <CheckboxRow checked={remember} label="Remember my login" onPress={() => setRemember((value) => !value)} />
      <ErrorMessage message={generalError} />
      <Button label="Sign In to Portal" loading={mutation.isPending} onPress={onSubmit} />
      <Text style={styles.note}>
        {channel === 'sms'
          ? 'If required, we’ll send your verification code via SMS.'
          : 'If required, we’ll send a verification code to your email.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 13 },
  forgot: { color: '#067765', fontSize: 11, fontWeight: '800', marginTop: -3 },
  note: { color: '#718178', fontSize: 11, textAlign: 'center' },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  channelLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#345e3b',
  },
  channelOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  channelChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: '#edf5e8',
    borderWidth: 1,
    borderColor: '#d2e4cb',
  },
  channelChipActive: {
    backgroundColor: '#bcf27f',
    borderColor: '#98df49',
  },
  channelChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#3e6347',
  },
  channelChipTextActive: {
    color: '#0e3017',
    fontWeight: '700',
  },
});

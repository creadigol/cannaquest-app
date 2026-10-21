import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { FormTextInput } from '@/components/ui/FormTextInput';
import { getOtpDestination, resendOtp } from '../api/auth.api';
import { useAuth } from '../auth.context';
import { useVerifyOtp } from '../hooks/useVerifyOtp';
import { otpSchema, type OtpFormValues } from '../schemas/otp.schema';

function formatAustralianMobile(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

export function OtpForm() {
  const router = useRouter();
  const { state, setPendingOtp } = useAuth();
  const pendingOtp = state.pendingOtp;
  const currentChannel = pendingOtp?.channel ?? 'email';
  const mutation = useVerifyOtp();
  const inputRef = useRef<TextInput>(null);
  const [submittedCode, setSubmittedCode] = useState<string | undefined>();
  const { control, handleSubmit } = useForm<OtpFormValues>({ resolver: zodResolver(otpSchema), defaultValues: { code: '' } });

  // Mobile number input state for users lacking a phone number on file
  const [mobileNumber, setMobileNumber] = useState('');
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [phoneSaved, setPhoneSaved] = useState(false);

  // Resend / Switch Channel States
  const [isResending, setIsResending] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  useEffect(() => {
    if (state.status === 'unauthenticated' && !state.pendingOtp) {
      router.replace('/(auth)/login' as Href);
    }
  }, [router, state.status, state.pendingOtp]);

  const onSubmit = handleSubmit(({ code }) => {
    if (mutation.isPending || submittedCode === code) return;
    setSubmittedCode(code);
    mutation.mutate(code, {
      onSuccess: () => {
        router.replace('/(app)/(tabs)' as Href);
      },
      onError: (err) => {
        console.error('[VerifyOtp] Error verifying OTP:', err);
        setSubmittedCode(undefined);
      },
    });
  });

  const code = useWatch({ control, name: 'code' });
  useEffect(() => {
    if (code?.length === 6 && submittedCode !== code) onSubmit();
  }, [code, onSubmit, submittedCode]);

  // Handle saving Australian phone number & triggering SMS OTP
  const handleSavePhoneAndSend = async () => {
    const clean = mobileNumber.replace(/\s+/g, '');
    if (!/^04\d{8}$/.test(clean)) {
      setMobileError('Enter a valid Australian mobile number (04xx xxx xxx).');
      return;
    }
    setMobileError(null);
    if (!pendingOtp?.otpSessionId) return;

    setIsSendingSms(true);
    setActionError(null);
    setStatusMessage(null);
    try {
      await resendOtp({
        otpSessionId: pendingOtp.otpSessionId,
        channel: 'sms',
        phone: clean,
      });
      setPhoneSaved(true);
      setPendingOtp({
        ...pendingOtp,
        phone: clean,
        destination: clean,
        channel: 'sms',
        needsPhone: false,
      });
      setStatusMessage(`Verification code sent via SMS to ${clean}`);
      setCooldown(30);
    } catch (err: any) {
      setMobileError(err?.message || 'Failed to send SMS. Please verify the number.');
    } finally {
      setIsSendingSms(false);
    }
  };

  // 1. Resend on the current channel (Resend Email / Resend SMS)
  const handleResendCurrent = async () => {
    if (isResending || cooldown > 0 || !pendingOtp?.otpSessionId) return;
    setIsResending(true);
    setActionError(null);
    setStatusMessage(null);

    try {
      console.log(`[USER ACTION] Triggered Resend on channel: ${currentChannel.toUpperCase()}`);
      await resendOtp({
        otpSessionId: pendingOtp.otpSessionId,
        channel: currentChannel,
        phone: currentChannel === 'sms' ? pendingOtp.phone : undefined,
      });
      setStatusMessage(
        currentChannel === 'sms'
          ? 'Fresh OTP sent via SMS.'
          : 'Fresh OTP sent to your email.'
      );
      setCooldown(30);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  // 2. Switch Channel (Send OTP on SMS / Send OTP on Mail)
  const handleSwitchChannel = async () => {
    if (isSwitching || cooldown > 0 || !pendingOtp?.otpSessionId) return;
    const nextChannel: 'email' | 'sms' = currentChannel === 'sms' ? 'email' : 'sms';

    setIsSwitching(true);
    setActionError(null);
    setStatusMessage(null);

    try {
      console.log(`[USER ACTION] Switching OTP channel to: ${nextChannel.toUpperCase()}`);

      // If switching to SMS, check if we have a phone number on file
      let destInfo: { email?: string; phone?: string } | null = null;
      if (nextChannel === 'sms') {
        try {
          destInfo = await getOtpDestination(pendingOtp.otpSessionId);
        } catch {
          // ignore
        }
      }

      const hasPhone = Boolean(
        pendingOtp.phone || (destInfo?.phone && destInfo.phone.trim().length > 0)
      );

      if (nextChannel === 'sms' && !hasPhone) {
        // Needs user to input mobile number
        setPendingOtp({
          ...pendingOtp,
          channel: 'sms',
          destination: undefined,
          needsPhone: true,
        });
        setStatusMessage('Please enter your mobile number to receive SMS OTP.');
        return;
      }

      await resendOtp({
        otpSessionId: pendingOtp.otpSessionId,
        channel: nextChannel,
        phone: nextChannel === 'sms' ? (pendingOtp.phone || destInfo?.phone) : undefined,
      });

      const updatedDestination =
        nextChannel === 'sms'
          ? (pendingOtp.phone || destInfo?.phone)
          : (pendingOtp.email || destInfo?.email);

      setPendingOtp({
        ...pendingOtp,
        channel: nextChannel,
        destination: updatedDestination,
        needsPhone: false,
      });

      setStatusMessage(
        nextChannel === 'sms'
          ? 'Switched! Verification code sent via SMS.'
          : 'Switched! Verification code sent to your email.'
      );
      setCooldown(30);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to switch channel. Please try again.');
    } finally {
      setIsSwitching(false);
    }
  };

  const showPhonePrompt = currentChannel === 'sms' && pendingOtp?.needsPhone && !phoneSaved;

  return (
    <View style={styles.form}>
      {/* If user requested SMS but no phone number exists in DB, prompt them here */}
      {showPhonePrompt ? (
        <View style={styles.phonePromptBox}>
          <Text style={styles.promptTitle}>Mobile number needed for SMS</Text>
          <Text style={styles.promptSubtitle}>
            We don’t have a mobile number on file for your account. Please enter your Australian mobile number to receive your code:
          </Text>
          <FormTextInput
            label="Mobile phone (Australian)"
            keyboardType="phone-pad"
            placeholder="0412 345 678"
            maxLength={12}
            value={mobileNumber}
            onBlur={() => {
              const clean = mobileNumber.replace(/\s+/g, '');
              if (clean.length > 0 && !/^04\d{8}$/.test(clean)) {
                setMobileError('Enter a valid Australian mobile number (04xx xxx xxx).');
              } else {
                setMobileError(null);
              }
            }}
            onChangeText={(val) => {
              const formatted = formatAustralianMobile(val);
              setMobileNumber(formatted);
              const clean = formatted.replace(/\s+/g, '');
              if (clean.length === 10) {
                if (!/^04\d{8}$/.test(clean)) {
                  setMobileError('Enter a valid Australian mobile number (04xx xxx xxx).');
                } else {
                  setMobileError(null);
                }
              } else if (mobileError && clean.length < 10) {
                setMobileError(null);
              }
            }}
            error={mobileError || undefined}
          />
          <Button
            label={isSendingSms ? 'Sending SMS…' : 'Send Code via SMS'}
            loading={isSendingSms}
            onPress={handleSavePhoneAndSend}
          />
        </View>
      ) : null}

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
                {Array.from({ length: 6 }, (_, index) => (
                  <View key={index} style={[styles.codeBox, index === activeIndex ? styles.codeBoxActive : undefined, fieldState.error ? styles.codeBoxError : undefined]}>
                    <Text style={styles.codeText}>{displayedCode[index] ?? ''}</Text>
                  </View>
                ))}
                <TextInput
                  ref={inputRef}
                  accessibilityLabel="Verification code input"
                  autoComplete="one-time-code"
                  autoFocus={!showPhonePrompt}
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

      {statusMessage ? <Text style={styles.statusSuccess}>{statusMessage}</Text> : null}
      {actionError ? <ErrorMessage message={actionError} /> : null}
      <ErrorMessage message={mutation.error instanceof Error ? mutation.error.message : undefined} />

      <Button label="Continue" loading={mutation.isPending} onPress={onSubmit} />

      {/* ── Secondary Actions: Resend & Switch Channel ── */}
      <View style={styles.actionsContainer}>
        {/* Action 1: Resend Mail / Resend SMS */}
        <Pressable
          disabled={isResending || cooldown > 0}
          onPress={handleResendCurrent}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
        >
          {isResending ? (
            <ActivityIndicator size="small" color="#0e3017" />
          ) : (
            <Text style={[styles.actionText, cooldown > 0 && styles.actionDisabled]}>
              {currentChannel === 'sms' ? 'Resend SMS' : 'Resend Email'}
              {cooldown > 0 ? ` (${cooldown}s)` : ''}
            </Text>
          )}
        </Pressable>

        <Text style={styles.actionDivider}>•</Text>

        {/* Action 2: Send OTP on SMS / Send OTP on Mail */}
        <Pressable
          disabled={isSwitching || cooldown > 0}
          onPress={handleSwitchChannel}
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionPressed]}
        >
          {isSwitching ? (
            <ActivityIndicator size="small" color="#0e3017" />
          ) : (
            <Text style={[styles.actionTextSecondary, cooldown > 0 && styles.actionDisabled]}>
              {currentChannel === 'sms' ? 'Send OTP on Mail' : 'Send OTP on SMS'}
            </Text>
          )}
        </Pressable>
      </View>

      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>Back to Sign In</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
  phonePromptBox: {
    backgroundColor: '#f1f8eb',
    borderWidth: 1,
    borderColor: '#cce6be',
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 6,
  },
  promptTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#153b24',
  },
  promptSubtitle: {
    fontSize: 11.5,
    lineHeight: 16,
    color: '#4f6857',
  },
  field: { gap: 6 },
  label: { color: '#54705d', fontSize: 10, fontWeight: '800', letterSpacing: 0.3, textTransform: 'uppercase' },
  codeShell: { alignSelf: 'center', flexDirection: 'row', gap: 8, position: 'relative' },
  codeBox: { alignItems: 'center', backgroundColor: '#fff', borderColor: '#e1e2df', borderRadius: 8, borderWidth: 1, height: 48, justifyContent: 'center', width: 32 },
  codeBoxActive: { borderColor: '#087b45', borderWidth: 2 },
  codeBoxError: { borderColor: '#c85252' },
  codeText: { color: '#183a28', fontSize: 22, fontWeight: '600' },
  hiddenInput: { ...StyleSheet.absoluteFill, color: 'transparent', opacity: 0 },
  error: { color: '#b23c3c', fontSize: 12 },
  statusSuccess: { color: '#047857', fontSize: 12, fontWeight: '600', textAlign: 'center' },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  actionText: {
    color: '#153b24',
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  actionTextSecondary: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  actionDisabled: {
    color: '#8fa094',
    textDecorationLine: 'none',
  },
  actionDivider: {
    color: '#98a89d',
    fontSize: 14,
  },
  actionPressed: {
    opacity: 0.7,
  },
  backButton: { alignItems: 'center', marginTop: 2 },
  backText: { color: '#688071', fontSize: 13, fontWeight: '600' },
});

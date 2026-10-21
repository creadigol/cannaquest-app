import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, type Href } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { CheckboxRow } from '@/components/ui/CheckboxRow';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { FormTextInput } from '@/components/ui/FormTextInput';
import { useAuth } from '../auth.context';
import { useSignup } from '../hooks/useSignup';
import { signupSchema, type SignupFormValues } from '../schemas/signup.schema';

function formatAustralianMobile(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 10);
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

export function SignupForm() {
  const router = useRouter();
  const { setPendingOtp } = useAuth();
  const mutation = useSignup();
  const { control, handleSubmit } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { firstName: '', lastName: '', email: '', phone: '', medicareCardNumber: '', password: '', acceptTerms: false },
  });

  const onSubmit = handleSubmit((values) => {
    const { medicareCardNumber: _medicareCardNumber, acceptTerms: _acceptTerms, ...payload } = values;
    mutation.mutate(payload, {
      onSuccess: (result) => {
        setPendingOtp({ otpSessionId: result.otpSessionId, flow: 'register', email: values.email });
        router.push('/(auth)/verify-otp' as Href);
      },
    });
  });

  const fields: { name: 'firstName' | 'lastName' | 'email' | 'medicareCardNumber' | 'password'; label: string; props?: object }[] = [
    { name: 'firstName', label: 'First name' },
    { name: 'lastName', label: 'Last name' },
    { name: 'email', label: 'Email address', props: { autoCapitalize: 'none', keyboardType: 'email-address', placeholder: 'sarah@example.com' } },
    { name: 'medicareCardNumber', label: 'Medicare card number (optional)', props: { keyboardType: 'number-pad', placeholder: '2345 67890 1' } },
    { name: 'password', label: 'Create password', props: { autoCapitalize: 'none', placeholder: 'At least 8 characters', secureTextEntry: true } },
  ];

  return (
    <View style={styles.form}>
      <View style={styles.nameRow}>
        <View style={styles.nameField}><Controller control={control} name="firstName" render={({ field, fieldState }) => <FormTextInput {...fields[0].props} label="First name" onBlur={field.onBlur} onChangeText={field.onChange} value={field.value} error={fieldState.error?.message} />} /></View>
        <View style={styles.nameField}><Controller control={control} name="lastName" render={({ field, fieldState }) => <FormTextInput {...fields[1].props} label="Last name" onBlur={field.onBlur} onChangeText={field.onChange} value={field.value} error={fieldState.error?.message} />} /></View>
      </View>
      <Controller
        control={control}
        name="phone"
        render={({ field, fieldState }) => (
          <FormTextInput
            keyboardType="phone-pad"
            label="Mobile phone (Australian)"
            maxLength={12}
            onBlur={field.onBlur}
            onChangeText={(text) => field.onChange(formatAustralianMobile(text))}
            placeholder="0412 345 678"
            value={field.value}
            error={fieldState.error?.message}
          />
        )}
      />
      {fields.slice(2).map(({ name, label, props }) => (
        <Controller key={name} control={control} name={name} render={({ field, fieldState }) => <FormTextInput {...props} label={label} onBlur={field.onBlur} onChangeText={field.onChange} value={field.value} error={fieldState.error?.message} />} />
      ))}
      <Controller control={control} name="acceptTerms" render={({ field, fieldState }) => <View><CheckboxRow checked={field.value} label="I agree to clinical telehealth terms and consent to clinical assessment." onPress={() => field.onChange(!field.value)} />{fieldState.error ? <ErrorMessage message={fieldState.error.message} /> : null}</View>} />
      <ErrorMessage message={mutation.error instanceof Error ? mutation.error.message : undefined} />
      <Button label="Create Patient Account" loading={mutation.isPending} onPress={onSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 12 },
  nameRow: { flexDirection: 'row', gap: 10 },
  nameField: { flex: 1 },
});

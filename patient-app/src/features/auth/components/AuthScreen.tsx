import type { PropsWithChildren } from 'react';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type AuthMode = 'login' | 'signup';

type Props = PropsWithChildren<{
  title: string;
  subtitle: string;
  mode?: AuthMode;
  onModeChange?: (mode: AuthMode) => void;
  otp?: boolean;
  email?: string;
  destination?: string;
  channel?: 'email' | 'sms';
}>;

export function AuthScreen({ title, subtitle, mode, onModeChange, otp = false, email, destination, channel = 'email', children }: Props) {
  const displayContact = destination || email;
  const isPhone = channel === 'sms';

  return (
    <SafeAreaView style={[styles.safeArea, otp && styles.otpBackground]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[styles.content, otp && styles.otpContent]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {otp ? (
            <View style={styles.otpCard}>
              <Image accessibilityLabel="CannaQuest" source={require('../../../../assets/logos/app-logo.png')} style={styles.otpLogo} />
              <Text style={styles.eyebrow}>
                {isPhone ? (displayContact ? 'SMS Sent' : 'SMS Verification') : 'Email Sent'}
              </Text>
              <Text style={styles.otpTitle}>{title}</Text>
              <Text style={styles.otpSubtitle}>{subtitle}</Text>
              {displayContact ? <Text style={styles.email}>{displayContact}</Text> : null}
              {children}
            </View>
          ) : (
            <>
              <View style={styles.brandRow}>
                <View style={styles.brandInfo}>
                  <Image accessibilityLabel="CannaQuest logo" source={require('../../../../assets/logos/app-logo.png')} style={styles.brandLogo} />
                  <View>
                    <Text style={styles.brandName}>CANNAQUEST</Text>
                    <Text style={styles.brandCaption}>PATIENT PORTAL</Text>
                  </View>
                </View>
                <Text style={styles.hipaa}>🔒 HIPAA &amp; TGA</Text>
              </View>
              <View style={styles.heading}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
              </View>
              {mode && onModeChange ? (
                <View style={styles.segmented}>
                  <Pressable onPress={() => onModeChange('login')} style={[styles.segment, mode === 'login' && styles.activeSegment]}>
                    <Text style={[styles.segmentText, mode === 'login' && styles.activeSegmentText]}>Sign In</Text>
                  </Pressable>
                  <Pressable onPress={() => onModeChange('signup')} style={[styles.segment, mode === 'signup' && styles.activeSegment]}>
                    <Text style={[styles.segmentText, mode === 'signup' && styles.activeSegmentText]}>New Patient Sign Up</Text>
                  </Pressable>
                </View>
              ) : null}
              {children}
              <View style={styles.footer}>
                <Text style={styles.footerText}>Need assistance? Call our nurse line: <Text style={styles.footerStrong}>1300 892 110</Text></Text>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#f6f6f2', flex: 1 },
  otpBackground: { backgroundColor: '#657167' },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 18, paddingVertical: 20 },
  otpContent: { alignItems: 'center', justifyContent: 'center', padding: 20 },
  brandRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 28 },
  brandInfo: { alignItems: 'center', flexDirection: 'row', gap: 9 },
  brandLogo: { height: 35, width: 35 },
  brandName: { color: '#153d25', fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
  brandCaption: { color: '#718178', fontSize: 8, fontWeight: '600', letterSpacing: 0.8, marginTop: 2 },
  hipaa: { color: '#4c6854', fontSize: 8, fontWeight: '800' },
  heading: { gap: 7, marginBottom: 17 },
  title: { color: '#12391f', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  subtitle: { color: '#718178', fontSize: 12, lineHeight: 17, maxWidth: 330 },
  segmented: { backgroundColor: '#e9e9e6', borderRadius: 10, flexDirection: 'row', marginBottom: 19, padding: 3 },
  segment: { alignItems: 'center', borderRadius: 8, flex: 1, justifyContent: 'center', minHeight: 34, paddingHorizontal: 7 },
  activeSegment: { backgroundColor: '#ffffff', shadowColor: '#14391f', shadowOffset: { height: 1, width: 0 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 1 },
  segmentText: { color: '#66766c', fontSize: 10, fontWeight: '700' },
  activeSegmentText: { color: '#173a23' },
  footer: { borderTopColor: '#e7e8e3', borderTopWidth: 1, marginTop: 46, paddingTop: 18 },
  footerText: { color: '#7a887e', fontSize: 10, textAlign: 'center' },
  footerStrong: { color: '#214a2c', fontWeight: '800' },
  otpCard: { alignItems: 'center', backgroundColor: '#fffefa', borderRadius: 28, maxWidth: 360, paddingHorizontal: 28, paddingVertical: 34, width: '100%' },
  otpLogo: { height: 65, marginBottom: 20, width: 65 },
  eyebrow: { color: '#13805d', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 15, textTransform: 'uppercase' },
  otpTitle: { color: '#153b24', fontSize: 23, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  otpSubtitle: { color: '#506158', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  email: { color: '#153b24', fontSize: 14, fontWeight: '800', lineHeight: 21, marginBottom: 22, marginTop: 2, textAlign: 'center' },
});

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radii, shadows, spacing, typography } from '@/lib/theme/tokens';
import { uploadPrescription } from '../api/prescriptions.api';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function UploadPrescriptionModal({ visible, onClose, onSuccess }: Props) {
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePickDocument = async () => {
    try {
      setError(null);
      const { requireOptionalNativeModule } = await import('expo-modules-core');

      // 1. Try DocumentPicker if compiled into binary
      const docModule = requireOptionalNativeModule('ExpoDocumentPicker');
      if (docModule) {
        const DocumentPicker = await import('expo-document-picker');
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/pdf', 'image/*'],
          copyToCacheDirectory: true,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
          setSelectedFile(result.assets[0]);
          return;
        }
        return;
      }

      // 2. Try ImagePicker if compiled into binary
      const imgModule =
        requireOptionalNativeModule('ExponentImagePicker') ||
        requireOptionalNativeModule('ExpoImagePicker');
      if (imgModule) {
        const ImagePicker = await import('expo-image-picker');
        const imgResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.9,
          allowsEditing: false,
        });

        if (!imgResult.canceled && imgResult.assets && imgResult.assets.length > 0) {
          const asset = imgResult.assets[0];
          setSelectedFile({
            uri: asset.uri,
            name: asset.fileName || 'prescription.jpg',
            mimeType: asset.mimeType || 'image/jpeg',
            size: asset.fileSize,
          });
          return;
        }
        return;
      }

      // If neither native module is compiled into this dev APK build:
      setError(
        'File picking native module is not yet compiled into your running dev APK. Run "npx expo run:android" to compile it with native picker support.'
      );
    } catch (err: any) {
      console.warn('[UploadPrescriptionModal] Picker error:', err);
      setError(
        err?.message ||
          'Could not open file picker. Native module might require a rebuild.'
      );
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'ios' ? selectedFile.uri.replace('file://', '') : selectedFile.uri,
        name: selectedFile.name || 'prescription.pdf',
        type: selectedFile.mimeType || 'application/pdf',
      } as any);

      // 1. Upload to AWS S3 prescriptions storage
      try {
        const { uploadFileToS3 } = await import('@/features/customer/api/s3ComplianceService');
        const FileSystem = await import('expo-file-system');
        const fileContent = await FileSystem.readAsStringAsync(selectedFile.uri, {
          encoding: 'base64',
        });
        const safeName = (selectedFile.name || 'prescription.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
        const s3Key = `prescriptions/prescription_${Date.now()}_${safeName}`;
        await uploadFileToS3(s3Key, fileContent, selectedFile.mimeType || 'application/pdf');
      } catch (s3Err) {
        console.warn('[UploadPrescriptionModal] Direct S3 upload fallback:', s3Err);
      }

      // 2. Submit to backend API
      await uploadPrescription(formData);
      Alert.alert(
        'Prescription Uploaded',
        'Your prescription document was submitted and is pending clinical review.'
      );
      setSelectedFile(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to upload prescription. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Upload Prescription</Text>
              <Text style={styles.subtitle}>
                Upload your external script for pharmacy review and dispensing.
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Upload Area */}
          <Pressable
            onPress={handlePickDocument}
            style={({ pressed }) => [
              styles.dropzone,
              selectedFile && styles.dropzoneSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.uploadIcon}>{selectedFile ? '📄' : '📁'}</Text>
            <Text style={styles.dropzoneTitle}>
              {selectedFile ? selectedFile.name : 'Tap to select document or image'}
            </Text>
            <Text style={styles.dropzoneSub}>
              {selectedFile
                ? `${((selectedFile.size ?? 0) / 1024).toFixed(0)} KB · Tap to change`
                : 'Supports PDF, JPG, or PNG (Max 10MB)'}
            </Text>
          </Pressable>

          {/* Action Button */}
          <Pressable
            disabled={!selectedFile || uploading}
            onPress={handleUpload}
            style={({ pressed }) => [
              styles.submitBtn,
              (!selectedFile || uploading) && styles.submitBtnDisabled,
              pressed && styles.pressed,
            ]}
          >
            {uploading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Prescription</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: radii.xxl,
    maxWidth: 420,
    padding: spacing.lg,
    width: '100%',
    ...shadows.tier2,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.foreground,
    fontFamily: typography.bold,
    fontSize: 17,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.mutedForeground,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    color: colors.gray400,
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 11,
    marginBottom: 8,
  },
  dropzone: {
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderColor: 'rgba(0, 0, 0, 0.12)',
    borderRadius: radii.xl,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    padding: 24,
  },
  dropzoneSelected: {
    backgroundColor: 'rgba(14, 48, 23, 0.04)',
    borderColor: colors.primaryGreen,
    borderStyle: 'solid',
  },
  uploadIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  dropzoneTitle: {
    color: colors.foreground,
    fontFamily: typography.bold,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  dropzoneSub: {
    color: colors.mutedForeground,
    fontSize: 11,
    marginTop: 3,
  },
  submitBtn: {
    alignItems: 'center',
    backgroundColor: colors.primaryGreen,
    borderRadius: radii.xl,
    paddingVertical: 12,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#ffffff',
    fontFamily: typography.bold,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
});

export default UploadPrescriptionModal;


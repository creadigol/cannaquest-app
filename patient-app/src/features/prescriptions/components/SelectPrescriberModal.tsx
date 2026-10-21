import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radii, shadows, spacing, typography } from '@/lib/theme/tokens';
import type { PrescriberOption, Prescription } from '../api/prescriptions.types';
import {
  fetchMyPrescribers,
  selectPrescriptionPrescriber,
} from '../api/prescriptions.api';

type Props = {
  visible: boolean;
  prescription: Prescription | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function SelectPrescriberModal({
  visible,
  prescription,
  onClose,
  onSuccess,
}: Props) {
  const [prescribers, setPrescribers] = useState<PrescriberOption[]>([]);
  const [selectedPrescriberId, setSelectedPrescriberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      loadPrescribers();
    } else {
      setSelectedPrescriberId(null);
      setError(null);
    }
  }, [visible]);

  const loadPrescribers = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await fetchMyPrescribers();
      setPrescribers(list);
    } catch (err: any) {
      setError(err?.message || 'Failed to load prescribers.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!prescription || !selectedPrescriberId) return;

    try {
      setSubmitting(true);
      setError(null);
      await selectPrescriptionPrescriber(prescription.id, selectedPrescriberId);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to nominate prescriber.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible || !prescription) return null;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Choose Your Prescriber</Text>
              <Text style={styles.subtitle}>
                Select a doctor you’ve consulted with to review this prescription.
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </Pressable>
          </View>

          {/* Script summary */}
          <View style={styles.scriptSummary}>
            <Text style={styles.scriptName}>{prescription.productName}</Text>
            {prescription.strength ? (
              <Text style={styles.scriptStrength}>{prescription.strength}</Text>
            ) : null}
          </View>

          {/* Error Banner */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Prescribers List */}
          {loading ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator color={colors.primaryGreen} />
              <Text style={styles.loadingText}>Loading your prescribers...</Text>
            </View>
          ) : prescribers.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>
                No past prescribers found. You may need to complete a consultation first.
              </Text>
            </View>
          ) : (
            <View style={styles.list}>
              {prescribers.map((p) => {
                const isSelected = selectedPrescriberId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => setSelectedPrescriberId(p.id)}
                    style={({ pressed }) => [
                      styles.prescriberItem,
                      isSelected && styles.prescriberItemSelected,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.radioCircle}>
                      {isSelected ? <View style={styles.radioDot} /> : null}
                    </View>
                    <View style={styles.prescriberInfo}>
                      <Text
                        style={[
                          styles.prescriberName,
                          isSelected && styles.textSelected,
                        ]}
                      >
                        {p.name.startsWith('Dr') ? p.name : `Dr. ${p.name}`}
                      </Text>
                      {p.specialisation ? (
                        <Text style={styles.specialisation}>{p.specialisation}</Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* Submit Button */}
          <Pressable
            disabled={!selectedPrescriberId || submitting}
            onPress={handleConfirm}
            style={({ pressed }) => [
              styles.submitBtn,
              (!selectedPrescriberId || submitting) && styles.submitBtnDisabled,
              pressed && styles.pressed,
            ]}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Confirm Prescriber</Text>
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
    maxWidth: 440,
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
  scriptSummary: {
    backgroundColor: 'rgba(14, 48, 23, 0.05)',
    borderRadius: radii.md,
    marginBottom: spacing.md,
    padding: 10,
  },
  scriptName: {
    color: colors.primaryGreen,
    fontFamily: typography.bold,
    fontSize: 13,
    fontWeight: '700',
  },
  scriptStrength: {
    color: colors.gray500,
    fontSize: 11,
    marginTop: 2,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 11,
    marginBottom: 8,
  },
  loaderWrap: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 20,
  },
  loadingText: {
    color: colors.gray500,
    fontSize: 12,
  },
  emptyWrap: {
    paddingVertical: 16,
  },
  emptyText: {
    color: colors.gray500,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  list: {
    gap: 8,
    marginBottom: spacing.lg,
  },
  prescriberItem: {
    alignItems: 'center',
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  prescriberItemSelected: {
    backgroundColor: 'rgba(14, 48, 23, 0.04)',
    borderColor: colors.primaryGreen,
  },
  radioCircle: {
    alignItems: 'center',
    borderColor: colors.gray400,
    borderRadius: 9,
    borderWidth: 1.5,
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  radioDot: {
    backgroundColor: colors.primaryGreen,
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  prescriberInfo: {
    flex: 1,
  },
  prescriberName: {
    color: colors.foreground,
    fontFamily: typography.bold,
    fontSize: 13,
    fontWeight: '700',
  },
  textSelected: {
    color: colors.primaryGreen,
  },
  specialisation: {
    color: colors.gray500,
    fontSize: 11,
    marginTop: 1,
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

export default SelectPrescriberModal;


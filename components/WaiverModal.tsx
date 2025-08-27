import { useMemo, useRef, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';

export type Point = { x: number; y: number };
export type Stroke = { points: Point[] };
export type SignatureData = { strokes: Stroke[]; width: number; height: number };

function useSignaturePad(width: number, height: number) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const isDrawingRef = useRef<boolean>(false);

  const addPoint = (evt: GestureResponderEvent) => {
    const { locationX, locationY } = evt.nativeEvent;
    setStrokes((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (!last) return prev;
      last.points.push({ x: locationX, y: locationY });
      return next;
    });
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          isDrawingRef.current = true;
          const { locationX, locationY } = evt.nativeEvent;
          setStrokes((prev) => [...prev, { points: [{ x: locationX, y: locationY }] }]);
        },
        onPanResponderMove: (evt: GestureResponderEvent, _gs: PanResponderGestureState) => {
          if (!isDrawingRef.current) return;
          addPoint(evt);
        },
        onPanResponderRelease: () => {
          isDrawingRef.current = false;
        },
        onPanResponderTerminate: () => {
          isDrawingRef.current = false;
        },
      }),
    []
  );

  const clear = () => setStrokes([]);
  const undo = () => setStrokes((prev) => prev.slice(0, -1));
  const hasSignature = strokes.length > 0 && strokes.some((s) => s.points.length > 1);

  const toPathD = (s: Stroke) =>
    s.points
      .map((p, i) => (i === 0 ? `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}` : `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`))
      .join(' ');

  const signature: SignatureData = { strokes, width, height };

  return { panResponder, strokes, clear, undo, hasSignature, toPathD, signature };
}

export type WaiverModalProps = {
  visible: boolean;
  onClose: () => void;
  onSigned: (data: SignatureData) => void;
  waiverTitle?: string;
  waiverText?: string;
};

export default function WaiverModal({ visible, onClose, onSigned, waiverTitle = 'Participant Waiver & Release', waiverText = DEFAULT_WAIVER }: WaiverModalProps) {
  const { width } = Dimensions.get('window');
  const padWidth = Math.min(width - 32, 800);
  const padHeight = 220;

  const { panResponder, strokes, clear, undo, hasSignature, toPathD, signature } = useSignaturePad(padWidth, padHeight);
  const [scrolledToEnd, setScrolledToEnd] = useState<boolean>(false);
  const [signing, setSigning] = useState<boolean>(false);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <Text style={styles.title}>{waiverTitle}</Text>

        <ScrollView
          style={styles.waiverBox}
          onScroll={(e) => {
            const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
            const atEnd = contentOffset.y + layoutMeasurement.height >= contentSize.height - 24;
            if (atEnd) setScrolledToEnd(true);
          }}
          scrollEventThrottle={16}
        >
          <Text style={styles.waiverText}>{waiverText}</Text>
        </ScrollView>

        {!signing ? (
          <TouchableOpacity
            testID="waiver-begin-sign"
            style={[styles.button, !scrolledToEnd && styles.buttonDisabled]}
            disabled={!scrolledToEnd}
            onPress={() => setSigning(true)}
          >
            <Text style={styles.buttonText}>I read it — Continue to Sign</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.padWrapper}>
              <Svg width={padWidth} height={padHeight} {...panResponder.panHandlers}>
                <Rect x={0} y={0} width={padWidth} height={padHeight} fill="#fff" />
                {strokes.map((s, i) => (
                  <Path key={i} d={toPathD(s)} stroke="#111" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                ))}
              </Svg>
            </View>

            <View style={styles.row}>
              <TouchableOpacity testID="waiver-undo" style={styles.secondaryBtn} onPress={undo}>
                <Text style={styles.secondaryText}>Undo</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="waiver-clear" style={styles.secondaryBtn} onPress={clear}>
                <Text style={styles.secondaryText}>Clear</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              testID="waiver-sign-submit"
              style={[styles.button, !hasSignature && styles.buttonDisabled]}
              disabled={!hasSignature}
              onPress={() => onSigned(signature)}
            >
              <Text style={styles.buttonText}>Agree & Sign</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity testID="waiver-close" style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 16 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  waiverBox: { flex: 1, backgroundColor: '#0d0d0d', borderColor: '#333', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  waiverText: { color: '#ddd', fontSize: 14, lineHeight: 20 },
  padWrapper: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#111', borderColor: '#333', borderWidth: 1, borderRadius: 12, padding: 8, marginTop: 8 },
  row: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 8 },
  button: { backgroundColor: '#ff6b35', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#1a1a1a', borderRadius: 10 },
  secondaryText: { color: '#eee', fontSize: 14 },
  closeBtn: { alignItems: 'center', paddingVertical: 10 },
  closeText: { color: '#999', fontSize: 14 },
});

const DEFAULT_WAIVER = `Please read this Waiver & Release of Liability carefully before participating in any classes or activities at The Hot Temple. By signing below, you acknowledge and agree to the following:

1) Assumption of Risk: You understand that hot yoga and fitness activities involve inherent risks, including but not limited to dehydration, dizziness, muscle strain, and other injuries.
2) Health & Medical: You confirm that you are physically fit to participate and have consulted a physician if necessary.
3) Release: You release The Hot Temple, its owners, staff, and affiliates from any and all claims arising from participation.
4) Conduct & Rules: You agree to follow studio rules, instructions, and safety guidance.
5) Media: You consent (or can opt out at the front desk) to the use of photos/videos taken in class for promotional purposes.
6) Minors: If signing for a minor, you affirm you are their legal guardian.

By tapping “Agree & Sign”, you affirm you have read, understood, and voluntarily accept this Waiver.`
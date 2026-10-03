package webrtc

import (
	"bytes"
	"encoding/binary"
	"testing"
)

// avccToAnnexB and wrapAACinLATM are unexported — tested in the same package.

// ── avccToAnnexB ─────────────────────────────────────────────────────────────

func TestAvccToAnnexBSingleNAL(t *testing.T) {
	// AVCC: [0x00 0x00 0x00 0x03][0x65 0x88 0x84]
	nalData := []byte{0x65, 0x88, 0x84}
	avcc := make([]byte, 4+len(nalData))
	binary.BigEndian.PutUint32(avcc[:4], uint32(len(nalData)))
	copy(avcc[4:], nalData)

	result := avccToAnnexB(avcc)

	expected := append([]byte{0x00, 0x00, 0x00, 0x01}, nalData...)
	if !bytes.Equal(result, expected) {
		t.Errorf("avccToAnnexB single NAL: got %v, want %v", result, expected)
	}
}

func TestAvccToAnnexBMultipleNALs(t *testing.T) {
	nal1 := []byte{0x41, 0x9a, 0x24}
	nal2 := []byte{0x65, 0x88, 0x84, 0x00, 0x1f}

	var avcc []byte
	for _, nal := range [][]byte{nal1, nal2} {
		lenBuf := make([]byte, 4)
		binary.BigEndian.PutUint32(lenBuf, uint32(len(nal)))
		avcc = append(avcc, lenBuf...)
		avcc = append(avcc, nal...)
	}

	result := avccToAnnexB(avcc)

	startCode := []byte{0x00, 0x00, 0x00, 0x01}
	var expected []byte
	for _, nal := range [][]byte{nal1, nal2} {
		expected = append(expected, startCode...)
		expected = append(expected, nal...)
	}

	if !bytes.Equal(result, expected) {
		t.Errorf("avccToAnnexB multi-NAL:\ngot  %v\nwant %v", result, expected)
	}
}

func TestAvccToAnnexBEmpty(t *testing.T) {
	result := avccToAnnexB([]byte{})
	if len(result) != 0 {
		t.Errorf("avccToAnnexB empty: got %v, want empty", result)
	}
}

func TestAvccToAnnexBTooShort(t *testing.T) {
	// Only 3 bytes — less than the 4-byte length prefix
	result := avccToAnnexB([]byte{0x00, 0x00, 0x05})
	if len(result) != 0 {
		t.Errorf("avccToAnnexB too-short: expected empty, got %v", result)
	}
}

func TestAvccToAnnexBTruncatedNAL(t *testing.T) {
	// Claims NAL of 10 bytes but only 3 bytes follow
	avcc := []byte{0x00, 0x00, 0x00, 0x0A, 0x65, 0x88, 0x84}
	result := avccToAnnexB(avcc)
	// Should not crash; should return empty (length exceeds available data)
	if len(result) != 0 {
		t.Errorf("avccToAnnexB truncated NAL: expected empty, got %v", result)
	}
}

func TestAvccToAnnexBZeroLengthNAL(t *testing.T) {
	// Zero-length NAL should be skipped (nalLen <= 0)
	avcc := []byte{0x00, 0x00, 0x00, 0x00, 0x65, 0x88}
	result := avccToAnnexB(avcc)
	if len(result) != 0 {
		t.Errorf("avccToAnnexB zero-length NAL: expected empty, got %v", result)
	}
}

// ── wrapAACinLATM ─────────────────────────────────────────────────────────────

func TestWrapAACinLATMStructure(t *testing.T) {
	aac := []byte{0x11, 0x90, 0x00, 0xCA, 0xFF}
	result := wrapAACinLATM(aac)

	// Total length = 4 header bytes + len(aac)
	if len(result) != 4+len(aac) {
		t.Errorf("wrapAACinLATM length: got %d, want %d", len(result), 4+len(aac))
	}

	// AU-Header-Length field = 16 (2 bytes)
	auHeaderLen := binary.BigEndian.Uint16(result[0:2])
	if auHeaderLen != 16 {
		t.Errorf("AU-Header-Length: got %d, want 16", auHeaderLen)
	}

	// AU-Header: size (13 bits) << 3 | index (3 bits = 0)
	auHeader := binary.BigEndian.Uint16(result[2:4])
	frameSize := uint16(len(aac))
	expectedAUHeader := (frameSize << 3) & 0xFFF8
	if auHeader != expectedAUHeader {
		t.Errorf("AU-Header: got 0x%04x, want 0x%04x", auHeader, expectedAUHeader)
	}

	// Payload bytes preserved
	if !bytes.Equal(result[4:], aac) {
		t.Errorf("wrapAACinLATM payload mismatch")
	}
}

func TestWrapAACinLATMEmpty(t *testing.T) {
	result := wrapAACinLATM([]byte{})
	if len(result) != 4 {
		t.Errorf("wrapAACinLATM empty: got %d bytes, want 4", len(result))
	}
	// AU-Header frameSize = 0 → header field = 0
	auHeader := binary.BigEndian.Uint16(result[2:4])
	if auHeader != 0 {
		t.Errorf("wrapAACinLATM empty frame: AU-Header should be 0, got %d", auHeader)
	}
}

func TestWrapAACinLATMLargeFrame(t *testing.T) {
	// 256-byte AAC frame — size field must fit in 13 bits (max 8191)
	aac := make([]byte, 256)
	for i := range aac {
		aac[i] = byte(i)
	}
	result := wrapAACinLATM(aac)

	// Verify payload intact
	if !bytes.Equal(result[4:], aac) {
		t.Error("wrapAACinLATM large frame: payload corrupted")
	}

	auHeader := binary.BigEndian.Uint16(result[2:4])
	frameSize := uint16(len(aac))
	expectedAUHeader := (frameSize << 3) & 0xFFF8
	if auHeader != expectedAUHeader {
		t.Errorf("wrapAACinLATM large frame AU-Header: got 0x%04x, want 0x%04x", auHeader, expectedAUHeader)
	}
}

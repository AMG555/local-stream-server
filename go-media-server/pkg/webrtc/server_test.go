package webrtc

import (
	"bytes"
	"encoding/binary"
	"testing"
)

// ── avccToAnnexB ─────────────────────────────────────────────────────────────

func TestAvccToAnnexBSingleNAL(t *testing.T) {
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
	result := avccToAnnexB([]byte{0x00, 0x00, 0x05})
	if len(result) != 0 {
		t.Errorf("avccToAnnexB too-short: expected empty, got %v", result)
	}
}

func TestAvccToAnnexBTruncatedNAL(t *testing.T) {
	avcc := []byte{0x00, 0x00, 0x00, 0x0A, 0x65, 0x88, 0x84}
	result := avccToAnnexB(avcc)
	if len(result) != 0 {
		t.Errorf("avccToAnnexB truncated NAL: expected empty, got %v", result)
	}
}

func TestAvccToAnnexBZeroLengthNAL(t *testing.T) {
	avcc := []byte{0x00, 0x00, 0x00, 0x00, 0x65, 0x88}
	result := avccToAnnexB(avcc)
	if len(result) != 0 {
		t.Errorf("avccToAnnexB zero-length NAL: expected empty, got %v", result)
	}
}

// ── makeADTS ─────────────────────────────────────────────────────────────────

func TestMakeADTSLength(t *testing.T) {
	frame := make([]byte, 100)
	hdr := makeADTS(frame)
	if len(hdr) != 7 {
		t.Errorf("makeADTS: header length = %d, want 7", len(hdr))
	}
}

func TestMakeADTSSyncWord(t *testing.T) {
	hdr := makeADTS([]byte{0x01, 0x02})
	// Bytes 0-1 must start with 0xFFF (12-bit syncword)
	sync := (uint16(hdr[0])<<4 | uint16(hdr[1])>>4)
	if sync != 0xFFF {
		t.Errorf("makeADTS: syncword = 0x%03X, want 0xFFF", sync)
	}
}

func TestMakeADTSProtectionAbsent(t *testing.T) {
	hdr := makeADTS([]byte{0x01})
	// Bit 0 of byte 1 = protection_absent = 1 (no CRC)
	if hdr[1]&0x01 != 1 {
		t.Errorf("makeADTS: protection_absent bit should be 1, got 0")
	}
}

func TestMakeADTSFrameLength(t *testing.T) {
	// Frame length field = 7 (header) + len(frame)
	frame := make([]byte, 50)
	hdr := makeADTS(frame)
	expectedLen := uint32(7 + 50)
	// Frame length spans bits 30–17 of the header (bytes 3-5, 13 bits)
	frameLen := (uint32(hdr[3]&0x03) << 11) | (uint32(hdr[4]) << 3) | (uint32(hdr[5]) >> 5)
	if frameLen != expectedLen {
		t.Errorf("makeADTS frame length: got %d, want %d", frameLen, expectedLen)
	}
}

func TestMakeADTSProfile(t *testing.T) {
	hdr := makeADTS([]byte{0x01})
	// Profile (AAC-LC = 1) is bits 7:6 of byte 2
	profile := (hdr[2] >> 6) & 0x3
	if profile != 1 {
		t.Errorf("makeADTS: profile = %d, want 1 (AAC-LC)", profile)
	}
}

func TestMakeADTSSamplingFreqIdx(t *testing.T) {
	hdr := makeADTS([]byte{0x01})
	// Sampling frequency index = 4 (44100 Hz), bits 5:2 of byte 2
	sfIdx := (hdr[2] >> 2) & 0xF
	if sfIdx != 4 {
		t.Errorf("makeADTS: sampling_freq_idx = %d, want 4 (44100 Hz)", sfIdx)
	}
}

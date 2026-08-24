package com.salman.swadhin;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;

import java.io.ByteArrayOutputStream;

/**
 * Shrinks a photo before it goes out as base64.
 *
 * A modern phone camera produces 4000x3000 JPEGs. Base64 adds another 33%, so an
 * untouched shot is roughly 8 MB of request body -- slow on mobile data and often
 * over the provider's limit. Scaling the long edge to ~1100px keeps text in the
 * photo readable while cutting the payload to a few hundred KB.
 */
final class Img {

    private Img() {
    }

    /**
     * @param raw     original file bytes
     * @param maxEdge longest side allowed, in pixels
     * @param quality JPEG quality, 1..100
     * @return re-encoded JPEG bytes, or null if decoding failed
     */
    static byte[] shrink(byte[] raw, int maxEdge, int quality) {
        if (raw == null || raw.length == 0) return null;
        try {
            // pass 1: read only the header to learn the real size
            BitmapFactory.Options probe = new BitmapFactory.Options();
            probe.inJustDecodeBounds = true;
            BitmapFactory.decodeByteArray(raw, 0, raw.length, probe);
            int w = probe.outWidth;
            int h = probe.outHeight;
            if (w <= 0 || h <= 0) return null;

            // pass 2: let the decoder subsample, so we never hold the full bitmap
            int sample = 1;
            while ((w / sample) > maxEdge * 2 && (h / sample) > maxEdge * 2) {
                sample *= 2;
            }
            BitmapFactory.Options o = new BitmapFactory.Options();
            o.inSampleSize = sample;
            Bitmap bm = BitmapFactory.decodeByteArray(raw, 0, raw.length, o);
            if (bm == null) return null;

            int bw = bm.getWidth();
            int bh = bm.getHeight();
            int longest = bw > bh ? bw : bh;
            if (longest > maxEdge) {
                float s = (float) maxEdge / (float) longest;
                Matrix m = new Matrix();
                m.postScale(s, s);
                Bitmap scaled = Bitmap.createBitmap(bm, 0, 0, bw, bh, m, true);
                if (scaled != bm) {
                    bm.recycle();
                    bm = scaled;
                }
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            bm.compress(Bitmap.CompressFormat.JPEG, quality, out);
            bm.recycle();
            byte[] r = out.toByteArray();
            return r.length > 0 ? r : null;
        } catch (Throwable e) {
            // includes OutOfMemoryError on very large photos
            return null;
        }
    }
}

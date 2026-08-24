package com.salman.swadhin;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;

import java.io.File;

/**
 * A tiny stand-in for androidx.core.content.FileProvider.
 *
 * From Android 7 (API 24) on, handing a file:// Uri to another app throws
 * FileUriExposedException, so the camera intent needs a content:// Uri instead.
 * AndroidX is deliberately not used in this project, so this provider does the
 * one job we need: expose files under getFilesDir()/cam to the camera app.
 *
 * Scope is intentionally narrow. Only that one directory is reachable, and any
 * path trying to escape it is rejected.
 */
public class NovaFiles extends ContentProvider {

    private static final String DIR = "cam";

    public static Uri getUriForFile(Context ctx, String authority, File f) {
        return Uri.parse("content://" + authority + "/" + DIR + "/" + f.getName());
    }

    @Override
    public boolean onCreate() {
        return true;
    }

    /** Resolve a uri to a real file, refusing anything outside the cam dir. */
    private File resolve(Uri uri) {
        String path = uri.getPath();
        if (path == null) return null;
        if (path.startsWith("/")) path = path.substring(1);
        if (!path.startsWith(DIR + "/")) return null;
        String name = path.substring(DIR.length() + 1);
        if (name.length() == 0 || name.contains("/") || name.contains("..")) return null;
        return new File(new File(getContext().getFilesDir(), DIR), name);
    }

    @Override
    public ParcelFileDescriptor openFile(Uri uri, String mode)
            throws java.io.FileNotFoundException {
        File f = resolve(uri);
        if (f == null) throw new java.io.FileNotFoundException("bad uri");
        int m = ParcelFileDescriptor.MODE_READ_ONLY;
        if (mode != null && mode.contains("w")) {
            m = ParcelFileDescriptor.MODE_CREATE
                    | ParcelFileDescriptor.MODE_READ_WRITE
                    | ParcelFileDescriptor.MODE_TRUNCATE;
        }
        return ParcelFileDescriptor.open(f, m);
    }

    @Override
    public Cursor query(Uri uri, String[] proj, String sel, String[] args, String sort) {
        File f = resolve(uri);
        if (f == null) return null;
        MatrixCursor c = new MatrixCursor(new String[]{"_display_name", "_size"});
        c.addRow(new Object[]{f.getName(), f.length()});
        return c;
    }

    @Override
    public String getType(Uri uri) {
        return "image/jpeg";
    }

    @Override
    public Uri insert(Uri uri, ContentValues v) {
        return null;
    }

    @Override
    public int delete(Uri uri, String sel, String[] args) {
        File f = resolve(uri);
        return (f != null && f.delete()) ? 1 : 0;
    }

    @Override
    public int update(Uri uri, ContentValues v, String sel, String[] args) {
        return 0;
    }
}

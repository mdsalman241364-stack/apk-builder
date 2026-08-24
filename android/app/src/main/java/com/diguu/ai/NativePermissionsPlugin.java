package com.diguu.ai;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "NativePermissions",
    permissions = {
        @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = "microphone"),
        @Permission(strings = { Manifest.permission.CAMERA }, alias = "camera"),
        @Permission(strings = { Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION }, alias = "location"),
        @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications"),
        @Permission(strings = { Manifest.permission.READ_CONTACTS }, alias = "contacts"),
        @Permission(strings = { Manifest.permission.READ_CALENDAR, Manifest.permission.WRITE_CALENDAR }, alias = "calendar"),
        @Permission(strings = { Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_VIDEO, Manifest.permission.READ_MEDIA_AUDIO }, alias = "storage_media_13"),
        @Permission(strings = { Manifest.permission.READ_EXTERNAL_STORAGE, Manifest.permission.WRITE_EXTERNAL_STORAGE }, alias = "storage_legacy")
    }
)
public class NativePermissionsPlugin extends Plugin {

    @PluginMethod
    public void checkAllPermissions(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("microphone", getPermissionStatus("microphone"));
        ret.put("camera", getPermissionStatus("camera"));
        ret.put("location", getPermissionStatus("location"));
        ret.put("notifications", getPermissionStatus("notifications"));
        ret.put("contacts", getPermissionStatus("contacts"));
        ret.put("calendar", getPermissionStatus("calendar"));
        ret.put("storage", getStoragePermissionStatus());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        String permissionKey = call.getString("permission");
        if (permissionKey == null) {
            call.reject("Permission key required");
            return;
        }

        String alias = permissionKey;
        if ("storage".equals(permissionKey)) {
            alias = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU ? "storage_media_13" : "storage_legacy";
        }

        if (isPermissionGranted(alias)) {
            JSObject res = new JSObject();
            res.put("permission", permissionKey);
            res.put("granted", true);
            res.put("status", "granted");
            res.put("permanentlyDenied", false);
            call.resolve(res);
            return;
        }

        requestPermissionForAlias(alias, call, "permissionCallback");
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        String permissionKey = call.getString("permission");
        if (permissionKey == null) {
            call.resolve();
            return;
        }

        String alias = permissionKey;
        if ("storage".equals(permissionKey)) {
            alias = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU ? "storage_media_13" : "storage_legacy";
        }

        boolean granted = isPermissionGranted(alias);

        boolean permanentlyDenied = false;
        if (!granted && getActivity() != null) {
            String[] strings = getPermissionStrings(alias);
            if (strings != null && strings.length > 0) {
                for (String p : strings) {
                    if (!ActivityCompat.shouldShowRequestPermissionRationale(getActivity(), p)) {
                        permanentlyDenied = true;
                        break;
                    }
                }
            }
        }

        JSObject res = new JSObject();
        res.put("permission", permissionKey);
        res.put("granted", granted);
        res.put("status", granted ? "granted" : (permanentlyDenied ? "denied_permanent" : "denied"));
        res.put("permanentlyDenied", permanentlyDenied);
        call.resolve(res);
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            Uri uri = Uri.fromParts("package", getContext().getPackageName(), null);
            intent.setData(uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Unable to open app settings: " + e.getMessage());
        }
    }

    private boolean isPermissionGranted(String alias) {
        String[] strings = getPermissionStrings(alias);
        if (strings == null || strings.length == 0) {
            return true;
        }
        for (String p : strings) {
            if (ContextCompat.checkSelfPermission(getContext(), p) != PackageManager.PERMISSION_GRANTED) {
                return false;
            }
        }
        return true;
    }

    private String getPermissionStatus(String alias) {
        if ("notifications".equals(alias) && Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return "granted";
        }
        if (isPermissionGranted(alias)) {
            return "granted";
        }
        return "denied";
    }

    private String getStoragePermissionStatus() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return isPermissionGranted("storage_media_13") ? "granted" : "denied";
        } else {
            return isPermissionGranted("storage_legacy") ? "granted" : "denied";
        }
    }

    private String[] getPermissionStrings(String alias) {
        if ("microphone".equals(alias)) {
            return new String[]{ Manifest.permission.RECORD_AUDIO };
        } else if ("camera".equals(alias)) {
            return new String[]{ Manifest.permission.CAMERA };
        } else if ("location".equals(alias)) {
            return new String[]{ Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION };
        } else if ("notifications".equals(alias)) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                return new String[]{ Manifest.permission.POST_NOTIFICATIONS };
            }
            return new String[0];
        } else if ("contacts".equals(alias)) {
            return new String[]{ Manifest.permission.READ_CONTACTS };
        } else if ("calendar".equals(alias)) {
            return new String[]{ Manifest.permission.READ_CALENDAR, Manifest.permission.WRITE_CALENDAR };
        } else if ("storage_media_13".equals(alias)) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                return new String[]{ Manifest.permission.READ_MEDIA_IMAGES, Manifest.permission.READ_MEDIA_VIDEO, Manifest.permission.READ_MEDIA_AUDIO };
            }
            return new String[0];
        } else if ("storage_legacy".equals(alias)) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                return new String[]{ Manifest.permission.READ_EXTERNAL_STORAGE };
            }
            return new String[0];
        }
        return new String[0];
    }
}

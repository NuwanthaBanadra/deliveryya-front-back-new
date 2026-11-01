package com.kaleox.deliveryya.utill;

import com.google.auth.oauth2.GoogleCredentials;
import com.kaleox.deliveryya.config.BusinessException;

import java.io.IOException;
import java.util.Collections;

public class FirebaseAuthUtil {

    private static final String FIREBASE_MESSAGING_SCOPE =
            "https://www.googleapis.com/auth/firebase.messaging";

    public static String getAccessToken() {

        try {
            GoogleCredentials googleCredentials = GoogleCredentials
                    .getApplicationDefault()
                    .createScoped(Collections.singletonList(FIREBASE_MESSAGING_SCOPE));

            googleCredentials.refreshIfExpired();

            return googleCredentials.getAccessToken().getTokenValue();
        } catch (IOException ex) {
            throw new BusinessException(
                    "Failed to retrieve Firebase credentials from the application environment", null);
        }
    }
}

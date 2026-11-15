package com.kaleox.deliveryya.entities;

/**
 * Deprecated wrapper kept for backward compatibility.
 * Use {@link ApiFeature} instead. This class intentionally does not
 * carry JPA annotations to avoid duplicate entity mapping.
 */
@Deprecated
public class ApiFeatures extends ApiFeature {
    // empty - exists only to allow older code referencing ApiFeatures to compile
}


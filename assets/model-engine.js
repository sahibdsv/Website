/**
 * Model Engine - Shared logic for model-viewer configuration across Website and Studio.
 * Handles parsing of hashtag-style tags (e.g., #rx45 #ry75 #z120 #rz15).
 */

export const MODEL_CONFIG = {
    DEFAULT_RADIUS_PCT: 85,
    DEFAULT_ORBIT: "45deg 75deg 85%",
    MIN_ORBIT: "-Infinity 0deg 20%",
    MAX_ORBIT: "Infinity 180deg 500%",
    DEFAULT_FOV: "15deg"
};

/**
 * Parses tags for camera orbit.
 * #rx[num] -> Pitch (Phi)
 * #ry[num] -> Yaw (Theta)
 * #z[num]  -> Zoom/Radius (Percentage of auto-fit)
 */
export function parseModelCameraOrbit(tagsArray) {
    const tags = new Set(tagsArray);
    let theta = "45deg";
    let phi = "75deg";
    let radius = `${MODEL_CONFIG.DEFAULT_RADIUS_PCT}%`;
    let hasOrbit = false;

    for (const tag of tags) {
        // ry represents Yaw (Theta)
        const thetaMatch = tag.match(/^ry(-?\d+)$/);
        if (thetaMatch) {
            theta = `${thetaMatch[1]}deg`;
            hasOrbit = true;
        }
        // rx represents Pitch (Phi)
        const phiMatch = tag.match(/^rx(-?\d+)$/);
        if (phiMatch) {
            phi = `${phiMatch[1]}deg`;
            hasOrbit = true;
        }
        // z represents zoom/radius percentage
        // Support legacy #s for backward compatibility during transition if needed, 
        // but we'll prioritize #z.
        const zoomMatch = tag.match(/^[zs]([\d.]+)$/);
        if (zoomMatch) {
            const val = parseFloat(zoomMatch[1]);
            // If it's a small number like 1.2, treat as multiplier of 85%
            const pct = val <= 10.0 ? Math.round(val * MODEL_CONFIG.DEFAULT_RADIUS_PCT) : Math.round(val);
            radius = `${pct}%`;
            hasOrbit = true;
        }
    }

    return hasOrbit ? `${theta} ${phi} ${radius}` : null;
}

/**
 * Parses tags for model orientation.
 * #rz[num] -> Roll (Steering wheel rotation)
 * zup      -> Preset for Z-up models
 * xup      -> Preset for X-up models
 */
export function parseModelOrientation(tagsArray) {
    const tags = new Set(tagsArray);
    let rx = 0; // Model-space Pitch
    let ry = 0; // Model-space Yaw
    let rz = 0; // Model-space Roll (Steering wheel)
    let hasOrientation = false;
    
    if (tags.has('zup')) {
        rx = -90;
        hasOrientation = true;
    } else if (tags.has('xup')) {
        rz = 90;
        hasOrientation = true;
    }
    
    for (const tag of tags) {
        const match = tag.match(/^rz(-?\d+)$/);
        if (match) {
            rz += parseInt(match[1], 10);
            hasOrientation = true;
        }
    }
    
    // model-viewer orientation: [yaw] [pitch] [roll]
    // Our #rz is Roll, so it's the 3rd parameter.
    return hasOrientation ? `${ry}deg ${rx}deg ${rz}deg` : null;
}

/**
 * Applies standard centering and behavior attributes to a model-viewer element.
 */
export function applyModelBaseAttributes(mv) {
    mv.setAttribute('camera-target', 'auto');
    mv.setAttribute('auto-align', '');
    mv.setAttribute('interaction-prompt', 'none');
    mv.setAttribute('interpolation-deceleration-ms', '0');
    mv.setAttribute('shadow-intensity', '0');
    mv.setAttribute('exposure', '0.75');
    mv.setAttribute('field-of-view', MODEL_CONFIG.DEFAULT_FOV);
    mv.setAttribute('min-camera-orbit', MODEL_CONFIG.MIN_ORBIT);
    mv.setAttribute('max-camera-orbit', MODEL_CONFIG.MAX_ORBIT);
}

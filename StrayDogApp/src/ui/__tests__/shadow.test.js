/**
 * Test file to verify shadow utility works correctly across platforms
 * Run this in React Native debugger or add console.log statements
 */

import { shadow, modernShadow } from '../ui/shadow';

// Test the current shadow utility
console.log('Shadow Level 1:', shadow(1));
console.log('Shadow Level 2:', shadow(2));
console.log('Shadow Level 3:', shadow(3));
console.log('Shadow Level 4:', shadow(4));

// Test with custom options
console.log('Shadow with custom color:', shadow(2, { color: '#FF0000', opacity: 0.5 }));

// Test the modern shadow utility (for future RN 0.76+ migration)
console.log('Modern Shadow Level 2:', modernShadow(2));

// Expected outputs:
// Web: Should use boxShadow property
// iOS: Should use shadowColor, shadowOffset, shadowOpacity, shadowRadius
// Android: Should use elevation and shadowColor

export { shadow, modernShadow };
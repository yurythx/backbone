import * as React from "react"

export function ThemeInitScript() {
  const scriptContent = `
    (function() {
      try {
        const tenantBranding = JSON.parse(localStorage.getItem('backbone_tenant_branding'));
        const userPreferences = JSON.parse(localStorage.getItem('backbone_user_preferences'));
        const darkTheme = document.documentElement.classList.contains('dark') || 
                         (localStorage.getItem('theme') === 'dark') ||
                         (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
        
        if (tenantBranding) {
          const root = document.documentElement;
          
          // Apply Palette
          let palette = tenantBranding.theme_palette || 'django-green';
          if (userPreferences && userPreferences.use_tenant_theme === false && userPreferences.theme_palette) {
            palette = userPreferences.theme_palette;
          }
          root.setAttribute('data-palette', palette);

          // Only apply colors if NOT in dark mode (let tailwind handle dark mode)
          if (!darkTheme) {
            // Apply Primary Color
            const primaryHex = tenantBranding.primary_color;
            if (primaryHex) {
              root.style.setProperty('--primary', primaryHex);
              // Contrast color logic (simplified for the script)
              const r = parseInt(primaryHex.slice(1, 3), 16);
              const g = parseInt(primaryHex.slice(3, 5), 16);
              const b = parseInt(primaryHex.slice(5, 7), 16);
              const brightness = (r * 299 + g * 587 + b * 114) / 1000;
              root.style.setProperty('--primary-foreground', brightness > 128 ? '#000000' : '#FFFFFF');
            }

            // Apply Secondary Color
            const secondaryHex = tenantBranding.secondary_color;
            if (secondaryHex) {
              root.style.setProperty('--secondary', secondaryHex);
              const r = parseInt(secondaryHex.slice(1, 3), 16);
              const g = parseInt(secondaryHex.slice(3, 5), 16);
              const b = parseInt(secondaryHex.slice(5, 7), 16);
              const brightness = (r * 299 + g * 587 + b * 114) / 1000;
              root.style.setProperty('--secondary-foreground', brightness > 128 ? '#000000' : '#FFFFFF');
            }

            // Apply Background
            const bgHex = tenantBranding.background_color;
            if (bgHex) {
              root.style.setProperty('--background', bgHex);
            }
          }

          // Apply Font Family
          if (tenantBranding.font_family) {
            root.style.setProperty('--font-family', '"' + tenantBranding.font_family + '", sans-serif');
          }
        }
      } catch (e) {
        console.error('Theme init script error:', e);
      }
    })();
  `

  return (
    <script
      id="theme-init-script"
      dangerouslySetInnerHTML={{ __html: scriptContent }}
    />
  )
}

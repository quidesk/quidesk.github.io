import os, time, base64
from playwright.sync_api import sync_playwright

os.makedirs('snapshots', exist_ok=True)

def stitch_images_in_browser(page, img_bytes_list, width, height, out_path):
    # Encode images to base64 data URLs
    data_urls = [f"data:image/png;base64,{base64.b64encode(b).decode('utf-8')}" for b in img_bytes_list]
    total_height = height * len(img_bytes_list)
    
    script = f"""
    (() => {{
        return new Promise((resolve) => {{
            const canvas = document.createElement('canvas');
            canvas.width = {width};
            canvas.height = {total_height};
            const ctx = canvas.getContext('2d');
            const urls = {data_urls};
            let loaded = 0;
            urls.forEach((url, idx) => {{
                const img = new Image();
                img.onload = () => {{
                    ctx.drawImage(img, 0, idx * {height});
                    loaded++;
                    if (loaded === urls.length) {{
                        resolve(canvas.toDataURL('image/png'));
                    }}
                }};
                img.src = url;
            }});
        }});
    }})()
    """
    stitched_data_url = page.evaluate(script)
    header, b64data = stitched_data_url.split(',', 1)
    with open(out_path, 'wb') as f:
        f.write(base64.b64decode(b64data))
    print(f"Saved stitched contact sheet: {out_path} ({width}x{total_height})")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # 1. Desktop: 1440x900
        print("Capturing Desktop 1440x900...")
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()
        page.goto('http://localhost:4173', wait_until='networkidle')
        page.wait_for_timeout(2000)
        
        # Positions: 0%, 20%, 40%, 60%, 80%, 100%
        desktop_shots = []
        scroll_steps = [0.0, 0.2, 0.4, 0.6, 0.8, 1.0]
        max_scroll = page.evaluate("document.documentElement.scrollHeight - window.innerHeight")
        
        for frac in scroll_steps:
            target_y = int(max_scroll * frac)
            page.evaluate(f"window.scrollTo(0, {target_y})")
            page.wait_for_timeout(400)
            shot = page.screenshot()
            desktop_shots.append(shot)
            
        stitch_images_in_browser(page, desktop_shots, 1440, 900, 'snapshots/scrollcraft-desktop-sheet.png')
        context.close()
        
        # 2. Mobile: 390x844
        print("Capturing Mobile 390x844...")
        m_context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            is_mobile=True,
            has_touch=True
        )
        m_page = m_context.new_page()
        m_page.goto('http://localhost:4173', wait_until='networkidle')
        m_page.wait_for_timeout(2000)
        
        m_shots = []
        m_steps = [0.0, 0.25, 0.5, 0.75, 1.0]
        m_max = m_page.evaluate("document.documentElement.scrollHeight - window.innerHeight")
        for frac in m_steps:
            target_y = int(m_max * frac)
            m_page.evaluate(f"window.scrollTo(0, {target_y})")
            m_page.wait_for_timeout(400)
            shot = m_page.screenshot()
            m_shots.append(shot)
            
        stitch_images_in_browser(m_page, m_shots, 390, 844, 'snapshots/scrollcraft-mobile-sheet.png')
        m_context.close()
        
        # 3. Reduced Motion: 1440x900
        print("Capturing Reduced Motion...")
        r_context = browser.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
        r_page = r_context.new_page()
        r_page.goto('http://localhost:4173', wait_until='networkidle')
        r_page.wait_for_timeout(1500)
        
        r_shots = []
        r_steps = [0.0, 0.5, 1.0]
        r_max = r_page.evaluate("document.documentElement.scrollHeight - window.innerHeight")
        for frac in r_steps:
            target_y = int(r_max * frac)
            r_page.evaluate(f"window.scrollTo(0, {target_y})")
            r_page.wait_for_timeout(300)
            shot = r_page.screenshot()
            r_shots.append(shot)
            
        stitch_images_in_browser(r_page, r_shots, 1440, 900, 'snapshots/scrollcraft-reduced-sheet.png')
        
        # 4. Keyboard Tab Order Verification
        print("Verifying keyboard tab order...")
        tab_targets = []
        r_page.evaluate("window.scrollTo(0, 0)")
        r_page.wait_for_timeout(300)
        for i in range(15):
            r_page.keyboard.press('Tab')
            focused = r_page.evaluate("""(() => {
                const el = document.activeElement;
                if (!el || el === document.body) return null;
                return {
                    tag: el.tagName,
                    role: el.getAttribute('role') || el.type || '',
                    text: (el.textContent || el.placeholder || el.getAttribute('aria-label') || '').trim().slice(0, 30),
                    id: el.id || el.className || ''
                };
            })()""")
            if focused:
                tab_targets.append(focused)
        print("Observed keyboard tab sequence:")
        for idx, t in enumerate(tab_targets[:10]):
            print(f"  {idx+1}. [{t['tag']}] role={t['role']} text='{t['text']}'")
        
        r_context.close()
        browser.close()
        print("Visual verification completed successfully.")

if __name__ == '__main__':
    main()

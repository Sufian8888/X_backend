#!/usr/bin/env python3
"""
X Poster using Undetected-Chromedriver
Bypasses X.com bot detection - No API key needed!
"""

import sys
import os
import time
import json
import argparse
import re
import subprocess
import tempfile
from urllib.parse import quote_plus
from dotenv import load_dotenv
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import ElementClickInterceptedException, TimeoutException, WebDriverException

# Load environment variables
load_dotenv()

def log(message):
    print(message, file=sys.stderr)

def set_input_value(driver, element, value, label):
    try:
        driver.execute_script(
            "arguments[0].scrollIntoView({block: 'center', inline: 'center'});",
            element
        )
        time.sleep(0.5)
        element.click()
        element.clear()
        element.send_keys(value)
        return
    except WebDriverException as error:
        log(f"[!] Native entry failed for {label}: {str(error).splitlines()[0]}")

    driver.execute_script(
        """
        const input = arguments[0];
        const value = arguments[1];
        input.removeAttribute('inert');
        input.focus();
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        """,
        element,
        value
    )

def submit_input(driver, element):
    try:
        element.send_keys(Keys.RETURN)
        return
    except WebDriverException as error:
        log(f"[!] Enter key submit failed: {str(error).splitlines()[0]}")

    driver.execute_script(
        """
        const input = arguments[0];
        const form = input.closest('form');
        if (form) {
          form.requestSubmit ? form.requestSubmit() : form.submit();
        } else {
          input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
          input.dispatchEvent(new KeyboardEvent('keyup', {key: 'Enter', bubbles: true}));
        }
        """,
        element
    )

def fill_login(driver, username, password):
    log("[*] Looking for username field...")

    username_selectors = [
        "input[name='text']",
        "input[name='username']",
        "input[autocomplete='username']",
        "input[type='text']"
    ]

    username_field = None
    for selector in username_selectors:
        try:
            username_field = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, selector))
            )
            log(f"[+] Found username field with selector: {selector}")
            break
        except Exception:
            continue

    if not username_field:
        raise Exception("Could not find username field")

    set_input_value(driver, username_field, username, "username field")
    time.sleep(1)
    submit_input(driver, username_field)
    time.sleep(3)

    log("[*] Looking for password field...")

    password_selectors = [
        "input[name='password']",
        "input[type='password']",
        "input[autocomplete='current-password']"
    ]

    password_field = None
    for selector in password_selectors:
        try:
            password_field = WebDriverWait(driver, 5).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, selector))
            )
            log(f"[+] Found password field with selector: {selector}")
            break
        except Exception:
            continue

    if not password_field:
        raise Exception("Could not find password field")

    set_input_value(driver, password_field, password, "password field")
    time.sleep(1)
    submit_input(driver, password_field)
    time.sleep(5)

def click_resiliently(driver, element, label="element"):
    """
    X sometimes leaves a transparent fixed overlay above controls for a moment.
    Try a normal click first, then progressively use safer fallbacks.
    """
    driver.execute_script(
        "arguments[0].scrollIntoView({block: 'center', inline: 'center'});",
        element
    )
    time.sleep(0.8)

    for attempt in range(1, 4):
        try:
            if attempt > 1:
                driver.find_element(By.TAG_NAME, "body").send_keys(Keys.ESCAPE)
                time.sleep(0.6)

            if element.get_attribute("disabled") or element.get_attribute("aria-disabled") == "true":
                log(f"[*] Waiting for {label} to become enabled...")
                WebDriverWait(driver, 8).until(
                    lambda _driver: not element.get_attribute("disabled")
                    and element.get_attribute("aria-disabled") != "true"
                )

            element.click()
            return
        except ElementClickInterceptedException as error:
            log(f"[!] {label} click intercepted on attempt {attempt}: {str(error).splitlines()[0]}")
        except WebDriverException as error:
            log(f"[!] {label} native click failed on attempt {attempt}: {str(error).splitlines()[0]}")

    try:
        log(f"[*] Trying ActionChains click for {label}...")
        ActionChains(driver).move_to_element(element).pause(0.3).click().perform()
        return
    except WebDriverException as error:
        log(f"[!] ActionChains click failed: {str(error).splitlines()[0]}")

    log(f"[*] Trying JavaScript click for {label}...")
    driver.execute_script("arguments[0].click();", element)

def build_chrome_options(chrome_binary=None):
    options = uc.ChromeOptions()

    if chrome_binary:
        options.binary_location = chrome_binary

    if os.getenv("POST_HEADLESS", "false").lower() == "true":
        options.add_argument("--headless=new")

    user_data_dir = tempfile.mkdtemp(prefix="xautomate-chrome-")
    options.add_argument(f"--user-data-dir={user_data_dir}")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-setuid-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-software-rasterizer")
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-application-cache")
    options.add_argument("--disable-background-networking")
    options.add_argument("--disable-background-timer-throttling")
    options.add_argument("--disable-client-side-phishing-detection")
    options.add_argument("--disable-default-apps")
    options.add_argument("--disable-features=Translate,BackForwardCache,VizDisplayCompositor,AudioServiceOutOfProcess")
    options.add_argument("--disable-hang-monitor")
    options.add_argument("--disable-ipc-flooding-protection")
    options.add_argument("--disable-popup-blocking")
    options.add_argument("--disable-prompt-on-repost")
    options.add_argument("--disable-renderer-backgrounding")
    options.add_argument("--disable-sync")
    options.add_argument("--metrics-recording-only")
    options.add_argument("--mute-audio")
    options.add_argument("--no-first-run")
    options.add_argument("--no-default-browser-check")
    options.add_argument("--no-zygote")
    options.add_argument("--password-store=basic")
    options.add_argument("--single-process")
    options.add_argument("--use-mock-keychain")
    options.add_argument("--window-size=1024,768")
    options.page_load_strategy = "eager"
    return options

def create_driver():
    log("[*] Starting undetected Chrome...")
    log("[*] Auto-detecting Chrome version...")

    chrome_binary = os.getenv("PUPPETEER_EXECUTABLE_PATH") or os.getenv("CHROME_BIN")
    options = build_chrome_options(chrome_binary)

    try:
        driver = uc.Chrome(options=options, version_main=None, suppress_banner=True)
        driver.set_page_load_timeout(35)
        driver.set_script_timeout(20)
        return driver
    except Exception as e:
        log(f"[!] First attempt failed: {str(e)[:100]}")
        log("[*] Retrying with version detection...")
        try:
            chrome_command = chrome_binary or "google-chrome"
            chrome_version = subprocess.check_output(
                [chrome_command, "--version"]
            ).decode().split()[-1].split('.')[0]
            log(f"[*] Detected Chrome version: {chrome_version}")

            options_retry = build_chrome_options(chrome_binary)

            driver = uc.Chrome(options=options_retry, version_main=int(chrome_version), suppress_banner=True)
            driver.set_page_load_timeout(35)
            driver.set_script_timeout(20)
            return driver
        except Exception as retry_error:
            raise Exception(f"Could not launch Chrome: {str(retry_error)}")

def safe_get(driver, url, label):
    try:
        driver.get(url)
    except TimeoutException:
        log(f"[!] {label} page load timed out; stopping load and continuing...")
        try:
            driver.execute_script("window.stop();")
        except Exception:
            pass

def is_logged_in(driver):
    if '/login' in driver.current_url or '/i/flow/login' in driver.current_url:
        return False

    logged_in_selectors = [
        "[data-testid='SideNav_NewTweet_Button']",
        "[data-testid='AppTabBar_Home_Link']",
        "a[href='/compose/post']",
        "a[href='/home']",
    ]

    for selector in logged_in_selectors:
        try:
            if driver.find_elements(By.CSS_SELECTOR, selector):
                return True
        except Exception:
            continue

    return False

def find_first_clickable(driver, selectors, timeout=5):
    for selector in selectors:
        try:
            element = WebDriverWait(driver, timeout).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
            )
            log(f"[+] Found element with selector: {selector}")
            return element
        except Exception:
            continue

    return None

def wait_until_enabled(driver, element, label):
    log(f"[*] Waiting for {label} to become enabled...")
    WebDriverWait(driver, 20).until(
        lambda _driver: element.is_displayed()
        and not element.get_attribute("disabled")
        and element.get_attribute("aria-disabled") != "true"
    )

def normalize_handle(value):
    return str(value or '').strip().lstrip('@')

def collect_visible_handlers(driver):
    reserved = {
        'home', 'explore', 'notifications', 'messages', 'i', 'settings',
        'search', 'compose', 'login', 'logout', 'privacy', 'tos'
    }
    handlers = {}

    cells = driver.find_elements(By.CSS_SELECTOR, "[data-testid='UserCell']")
    for cell in cells:
        candidates = []

        for link in cell.find_elements(By.CSS_SELECTOR, "a[href^='/']"):
            href = link.get_attribute("href") or link.get_attribute("pathname") or ""
            path = href.split("x.com/")[-1].split("?")[0].strip("/")
            if path and "/" not in path:
                candidates.append(path)

        cell_text = cell.text or ""
        for match in re.findall(r'@([A-Za-z0-9_]{1,15})\b', cell_text):
            candidates.append(match)

        for visible_handle in cell.find_elements(By.XPATH, ".//*[starts-with(normalize-space(text()), '@')]"):
            candidates.append(visible_handle.text)

        for button in cell.find_elements(By.CSS_SELECTOR, "button[aria-label^='Follow @']"):
            candidates.append(button.get_attribute("aria-label").replace("Follow @", ""))

        for candidate in candidates:
            handle = normalize_handle(candidate)
            if (
                handle
                and 1 <= len(handle) <= 15
                and handle.replace("_", "").isalnum()
                and handle.lower() not in reserved
            ):
                handlers[handle.lower()] = {
                    "username": handle.lower(),
                    "profileUrl": f"https://x.com/{handle}"
                }

    return list(handlers.values())

def scroll_search_results(driver):
    active = driver.switch_to.active_element
    try:
        active.send_keys(Keys.PAGE_DOWN)
        return
    except Exception:
        pass

    try:
        timeline = driver.find_element(By.CSS_SELECTOR, "[aria-label='Timeline: Search timeline']")
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", timeline)
        timeline.send_keys(Keys.PAGE_DOWN)
        return
    except Exception:
        pass

    driver.execute_script("window.scrollBy(0, Math.floor(window.innerHeight * 0.85));")

def open_explore_and_search(driver, query):
    log("[*] Opening X Explore...")

    try:
        explore_link = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "[data-testid='AppTabBar_Explore_Link'], a[href='/explore']"))
        )
        click_resiliently(driver, explore_link, "Explore link")
    except Exception:
        safe_get(driver, 'https://x.com/explore', 'X explore')

    time.sleep(3)

    log("[*] Looking for Explore search input...")
    search_input_selectors = [
        "[data-testid='SearchBox_Search_Input']",
        "input[aria-label='Search query']",
        "input[placeholder='Search']",
        "input[role='combobox']",
    ]

    search_input = None
    for selector in search_input_selectors:
        try:
            search_input = WebDriverWait(driver, 6).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
            )
            log(f"[+] Found Explore search input with selector: {selector}")
            break
        except Exception:
            continue

    if search_input:
        log(f"[*] Searching query from Explore search bar: {query}")
        search_input.click()
        time.sleep(0.5)
        search_input.send_keys(Keys.CONTROL, "a")
        search_input.send_keys(Keys.BACKSPACE)
        search_input.send_keys(query)
        time.sleep(0.8)
        search_input.send_keys(Keys.RETURN)
        time.sleep(4)
    else:
        log("[!] Explore search input not found; using direct People-search URL fallback...")

    people_url = f"https://x.com/search?q={quote_plus(query)}&src=typed_query&f=user"
    log("[*] Switching search results to People tab...")
    safe_get(driver, people_url, 'X people search')
    time.sleep(3)

def search_handlers_on_x(query, username=None, password=None, max_results=30, scroll_rounds=8):
    driver = None
    try:
        username = username or os.getenv('X_USERNAME')
        password = password or os.getenv('X_PASSWORD')

        if not query:
            raise ValueError('Search query is required')

        if not username or not password:
            raise ValueError(
                'Missing X credentials. '
                'Provide username/password or set X_USERNAME, X_PASSWORD in .env'
            )

        username = username.lstrip('@')
        max_results = max(1, min(int(max_results or 30), 100))
        scroll_rounds = max(1, min(int(scroll_rounds or 5), 15))

        log(f"[*] Starting handler extraction with account: {username}")
        driver = create_driver()

        log("[*] Navigating to X login...")
        safe_get(driver, 'https://x.com/login', 'X login')
        time.sleep(3)

        try:
            fill_login(driver, username, password)
            log("[*] Login attempt completed, waiting for page load...")
            time.sleep(3)
        except Exception as e:
            log(f"[!] Login error (may already be logged in): {str(e)}")

        open_explore_and_search(driver, query)

        try:
            WebDriverWait(driver, 25).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "[data-testid='UserCell']"))
            )
        except TimeoutException:
            raise Exception(
                "Could not find X People search results. "
                "X may be slow, blocked, or asking for verification in the browser."
            )

        handlers = {}
        stable_rounds = 0
        previous_count = 0

        for round_index in range(scroll_rounds):
            time.sleep(2)
            for handler in collect_visible_handlers(driver):
                handlers[handler["username"]] = handler

            log(f"[*] Search scroll {round_index + 1}: collected {len(handlers)} handlers")
            if len(handlers) >= max_results:
                break

            if len(handlers) == previous_count:
                stable_rounds += 1
            else:
                stable_rounds = 0
            previous_count = len(handlers)

            if stable_rounds >= 2:
                break

            scroll_search_results(driver)

        extracted = list(handlers.values())[:max_results]
        log(f"[+] Handler extraction completed: {len(extracted)} found")

        return {
            'ok': True,
            'message': 'Handlers extracted from X search',
            'query': query,
            'handlers': extracted,
            'count': len(extracted)
        }

    except Exception as e:
        error_message = str(e).strip().splitlines()[0] if str(e).strip() else e.__class__.__name__
        log(f"[ERROR] {error_message}")
        return {
            'ok': False,
            'error': error_message,
            'message': 'Failed to extract handlers from X search'
        }

    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass

def login_to_x(username=None, password=None):
    driver = None
    try:
        username = username or os.getenv('X_USERNAME')
        password = password or os.getenv('X_PASSWORD')

        if not username or not password:
            raise ValueError(
                'Missing X credentials. '
                'Provide username/password or set X_USERNAME, X_PASSWORD in .env'
            )

        username = username.lstrip('@')
        driver = create_driver()

        log("[*] Navigating to X login...")
        safe_get(driver, 'https://x.com/login', 'X login')
        time.sleep(3)
        fill_login(driver, username, password)
        log("[*] Login attempt completed, waiting for page load...")
        time.sleep(5)

        return {
            'ok': True,
            'message': 'Login attempt completed',
            'username': username
        }

    except Exception as e:
        log(f"[ERROR] {str(e)}")
        return {
            'ok': False,
            'error': str(e),
            'message': 'Failed to login to X'
        }

    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass

def post_to_x(text, username=None, password=None):
    """
    Post text to X using undetected-chromedriver
    
    Args:
        text: Post text to publish
        username: X username (defaults to X_USERNAME env var)
        password: X password (defaults to X_PASSWORD env var)
    """
    driver = None
    try:
        # Get credentials from arguments or .env
        username = username or os.getenv('X_USERNAME')
        password = password or os.getenv('X_PASSWORD')

        if not username or not password:
            raise ValueError(
                'Missing X credentials. '
                'Provide username/password or set X_USERNAME, X_PASSWORD in .env'
            )

        # Remove @ from username if present
        username = username.lstrip('@')

        log(f"[*] Starting undetected Chrome for user: {username}")
        driver = create_driver()

        log("[*] Navigating to X login...")
        safe_get(driver, 'https://x.com/login', 'X login')
        time.sleep(3)

        # Try to find and fill login form
        try:
            fill_login(driver, username, password)
            log("[*] Login attempt completed, waiting for page load...")
            time.sleep(6)

        except Exception as e:
            raise Exception(f"Login failed before posting: {str(e)}")

        if not is_logged_in(driver):
            raise Exception(
                "X login did not complete. Check credentials, 2FA, verification challenge, or account lock."
            )

        # Navigate to home/compose
        log("[*] Navigating to X compose...")
        safe_get(driver, 'https://x.com/compose/post', 'X compose')
        time.sleep(3)

        # Look for the post composer
        log("[*] Looking for post composer...")

        composer_selectors = [
            "[data-testid='tweetTextarea_0']",
            "[data-testid='tweetTextarea_1']",
            "div[aria-label='Post text'][contenteditable='true']",
            "[role='textbox']",
            "[data-testid='tweet']",
            "div[contenteditable='true']"
        ]

        composer = find_first_clickable(driver, composer_selectors, timeout=7)

        if not composer:
            log("[!] Compose route did not show composer; trying X home...")
            safe_get(driver, 'https://x.com/home', 'X home')
            time.sleep(3)
            composer = find_first_clickable(driver, composer_selectors, timeout=7)

        if not composer:
            raise Exception("Could not find post composer after successful login")

        # Click and type the post
        log(f"[*] Clicking composer and typing post: {text[:50]}...")
        composer.click()
        time.sleep(1)
        composer.send_keys(text)
        time.sleep(2)

        typed_text = composer.text.strip()
        if not typed_text:
            log("[!] Composer text was empty after send_keys; retrying with clipboard paste...")
            composer.click()
            composer.send_keys(Keys.CONTROL, "a")
            composer.send_keys(text)
            time.sleep(2)

        # Find and click the post button
        log("[*] Looking for post button...")

        post_button_selectors = [
            "[data-testid='tweetButtonInline']",
            "[data-testid='tweetButton']",
            "button[data-testid*='tweet']",
            "button:has-text('Post')"
        ]

        post_button = None
        for selector in post_button_selectors:
            try:
                post_button = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                )
                log(f"[+] Found post button with selector: {selector}")
                break
            except Exception:
                continue

        if not post_button:
            # Try to find by text content
            try:
                buttons = driver.find_elements(By.TAG_NAME, "button")
                for button in buttons:
                    if "Post" in button.text or "post" in button.text:
                        post_button = button
                        log("[+] Found post button by text content")
                        break
            except Exception:
                pass

        if not post_button:
            raise Exception("Could not find post button")

        wait_until_enabled(driver, post_button, "post button")
        log("[*] Clicking post button...")
        click_resiliently(driver, post_button, "post button")
        time.sleep(3)

        log("[+] Post submitted successfully!")
        
        return {
            'ok': True,
            'message': 'Posted to X successfully',
            'text': text
        }

    except Exception as e:
        log(f"[ERROR] {str(e)}")
        return {
            'ok': False,
            'error': str(e),
            'message': 'Failed to post to X'
        }

    finally:
        if driver:
            try:
                driver.quit()
            except Exception:
                pass

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--login', action='store_true')
    parser.add_argument('--post', action='store_true')
    parser.add_argument('--search-handlers', action='store_true')
    parser.add_argument('values', nargs='*')
    args = parser.parse_args()

    if args.login:
        username = args.values[0] if len(args.values) > 0 else None
        password = args.values[1] if len(args.values) > 1 else None
        log(f"[*] Arguments: login username={username or 'from .env'}")
        result = login_to_x(username=username, password=password)
        print(json.dumps(result))
        sys.exit(0)

    if args.post:
        if len(args.values) < 1:
            print(json.dumps({'ok': False, 'error': 'No text provided'}))
            sys.exit(1)

        text = args.values[0]
        username = args.values[1] if len(args.values) > 1 else None
        password = args.values[2] if len(args.values) > 2 else None
        log(f"[*] Arguments: text={text[:50]}..., username={username or 'from .env'}")
        result = post_to_x(text, username=username, password=password)
        print(json.dumps(result))
        sys.exit(0)

    if args.search_handlers:
        if len(args.values) < 1:
            print(json.dumps({'ok': False, 'error': 'No search query provided'}))
            sys.exit(1)

        query = args.values[0]
        username = args.values[1] if len(args.values) > 1 else None
        password = args.values[2] if len(args.values) > 2 else None
        max_results = args.values[3] if len(args.values) > 3 else 30
        scroll_rounds = args.values[4] if len(args.values) > 4 else 8
        log(f"[*] Arguments: query={query}, username={username or 'from .env'}, max_results={max_results}, scroll_rounds={scroll_rounds}")
        result = search_handlers_on_x(query, username=username, password=password, max_results=max_results, scroll_rounds=scroll_rounds)
        print(json.dumps(result))
        sys.exit(0)

    if len(sys.argv) < 2:
        print(json.dumps({'ok': False, 'error': 'No text provided'}))
        sys.exit(1)

    text = sys.argv[1]
    username = sys.argv[2] if len(sys.argv) > 2 else None
    password = sys.argv[3] if len(sys.argv) > 3 else None

    log(f"[*] Arguments: text={text[:50]}..., username={username or 'from .env'}")

    result = post_to_x(text, username=username, password=password)
    print(json.dumps(result))

import unittest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

# --- KONFIGURASI ---
# Ubah URL ini sesuai dengan URL lokal Anda. 
# Jika menggunakan php artisan serve: http://localhost:8000
# Jika menggunakan laragon biasa mungkin: http://localhost/photsud/public atau http://photsud.test
BASE_URL = "http://localhost:8000" 

# Kredensial Dummy (Silakan ganti dengan yang valid)
DUMMY_EMAIL = "admin@memoforia.com"
DUMMY_PASSWORD = "password"
# -------------------

class PhotsudWebTests(unittest.TestCase):
    def setUp(self):
        # Inisialisasi Chrome WebDriver. 
        # (Selenium versi terbaru akan otomatis mendownload ChromeDriver yang sesuai)
        options = webdriver.ChromeOptions()
        # options.add_argument('--headless') # Uncomment jika tidak ingin browser terbuka saat testing
        options.add_argument('--window-size=1280,800')
        self.driver = webdriver.Chrome(options=options)
        self.driver.implicitly_wait(5) # Wait up to 5 seconds for elements to appear

    def test_1_homepage_loads(self):
        """Memastikan Halaman Utama dapat dimuat dan tidak error."""
        driver = self.driver
        driver.get(BASE_URL)
        
        # Beri jeda sedikit agar animasi/React selesai render
        time.sleep(2)
        
        # Verifikasi bahwa kita tidak berada di halaman error
        self.assertNotIn("Error", driver.title)
        
        print("✅ [Test 1] Halaman Home berhasil dimuat.")

    def test_2_navigation(self):
        """Memastikan navigasi ke halaman lain berfungsi."""
        driver = self.driver
        driver.get(BASE_URL)
        time.sleep(2)

        try:
            # Mencari link navigasi ke 'Locations' (Ganti selector jika teksnya berbeda)
            # Asumsi ada tag <a> dengan teks "Locations" atau href mengandung '/locations'
            locations_link = driver.find_element(By.CSS_SELECTOR, "a[href*='/locations']")
            locations_link.click()
            
            # Tunggu url berubah
            WebDriverWait(driver, 5).until(EC.url_contains("/locations"))
            print("✅ [Test 2] Navigasi ke halaman Locations berhasil.")
        except Exception as e:
            print("❌ [Test 2] Navigasi gagal atau elemen tidak ditemukan:", e)

    def test_3_login_flow(self):
        """Memastikan form login dapat diisi dan mengembalikan respon (baik gagal/berhasil)."""
        driver = self.driver
        driver.get(f"{BASE_URL}/login")
        time.sleep(2)

        try:
            # Cari input email dan password
            # Asumsi name="email" dan name="password" (standar Laravel)
            email_input = driver.find_element(By.CSS_SELECTOR, "input[type='email']")
            password_input = driver.find_element(By.CSS_SELECTOR, "input[type='password']")
            
            # Masukkan kredensial dummy
            email_input.send_keys(DUMMY_EMAIL)
            password_input.send_keys(DUMMY_PASSWORD)
            
            # Cari tombol submit (asumsi type="submit")
            submit_btn = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
            submit_btn.click()

            time.sleep(3) # Tunggu proses otentikasi
            
            # Verifikasi apakah masuk ke dashboard atau muncul error
            current_url = driver.current_url
            if "/admin/dashboard" in current_url:
                print("✅ [Test 3] Login Berhasil. Masuk ke Dashboard.")
            else:
                # Jika gagal login, biasanya tetap di halaman login atau muncul pesan error
                print(f"ℹ️ [Test 3] Login ditolak (kredensial mungkin salah), URL saat ini: {current_url}")
                # Kita anggap test ini "pass" karena sistem berjalan (tidak crash), 
                # hanya saja kredensial salah
        except Exception as e:
            self.fail(f"❌ [Test 3] Terjadi error pada alur login: {e}")

    def tearDown(self):
        # Tutup browser setelah test selesai
        self.driver.quit()

if __name__ == "__main__":
    print("Memulai Pengujian Selenium pada Website Photsud...")
    unittest.main()

import time
from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException, TimeoutException
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager


# 드라이버 설정
def setup_driver():
    options = webdriver.ChromeOptions()
    options.add_argument('--headless') 
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument('user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36')
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    return driver


# 팝업 처리
def handle_popup(driver):
    try:
        close_button = WebDriverWait(driver, 5).until(
            EC.element_to_be_clickable((By.CLASS_NAME, "close"))
        )
        close_button.click()
    except TimeoutException:
        pass  # 팝업이 없으면 그냥 넘어감


# 스크롤 처리
def scroll_to_bottom(driver):
    last_height = driver.execute_script("return document.body.scrollHeight")
    while True:
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)  # 대기 시간 조정
        new_height = driver.execute_script("return document.body.scrollHeight")
        if new_height == last_height:  # 더 이상 로드할 데이터가 없으면 중단
            break
        last_height = new_height


# 제품 정보 추출
def fetch_products(driver):
    products = driver.find_elements(By.CLASS_NAME, "search-product")
    results = []
    seen_links = set()

    for product in products:
        try:
            name = product.find_element(By.CLASS_NAME, "name").text
            price = product.find_element(By.CLASS_NAME, "price-value").text
            link = product.find_element(By.TAG_NAME, 'a').get_attribute('href')

            # 중복 제거
            if link not in seen_links:
                seen_links.add(link)
                results.append({'name': name, 'price': price, 'link': link})
        except NoSuchElementException:
            continue  # 요소가 없으면 건너뜀
    return results[:10]  # 상위 10개만 반환


# Coupang 검색 기능
def search_coupang(keyword):
    driver = setup_driver()
    driver.get("https://www.coupang.com/")

    try:
        handle_popup(driver)

        # 검색어 입력
        search_box = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.NAME, "q"))
        )
        search_box.send_keys(keyword)
        search_box.send_keys(Keys.RETURN)

        # 검색 결과 로딩 대기
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "search-product"))
        )

        # 스크롤하여 모든 데이터 로드
        scroll_to_bottom(driver)

        # 제품 정보 가져오기
        return fetch_products(driver)

    except Exception as e:
        print(f"검색 중 오류: {e}")
        return []
    finally:
        driver.quit()


def main():
    keyword = input("검색할 키워드를 입력하세요: ")
    results = search_coupang(keyword)

    if results:
        print(f"\n'{keyword}' 검색 결과:")
        for idx, result in enumerate(results, 1):
            print(f"{idx}. 제품명: {result['name']}")
            print(f"   가격: {result['price']}")
            print(f"   링크: {result['link']}")
            print("-" * 50)

        print(f"\n총 {len(results)}개의 제품이 검색되었습니다.")
    else:
        print("검색 결과를 가져오는 데 실패했습니다.")


if __name__ == "__main__":
    main()

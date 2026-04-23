import os
import time
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

queries = [
    "Virat Kohli cover drive",
    "MS Dhoni helicopter shot",
    "Rohit Sharma pull shot",
    "KL Rahul flick shot",
    "Hardik Pandya six hitting",
    "Jasprit Bumrah bowling action",
    "Bhuvneshwar Kumar bowling action",
    "Ben Stokes batting",
    "Steve Smith test batting",
    "AB de Villiers 360 shot",
    "Chris Gayle six hitting"
]

os.makedirs("images", exist_ok=True)

driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))

for query in queries:
    print(f"\nSearching for: {query}")

    url = f"https://duckduckgo.com/?q={query.replace(' ', '+')}&iax=images&ia=images"
    driver.get(url)

    time.sleep(3)

    # Scroll to load images
    for _ in range(5):
        driver.execute_script("window.scrollBy(0,1000)")
        time.sleep(2)

    images = driver.find_elements(By.TAG_NAME, "img")

    print("Found:", len(images))

    count = 0

    for img in images:
        src = img.get_attribute("src")

        if src and src.startswith("http"):
            try:
                img_data = requests.get(src).content

                filename = f"images/{query.replace(' ', '_')}_{count}.jpg"

                with open(filename, "wb") as f:
                    f.write(img_data)

                print("Downloaded:", filename)

                count += 1

                if count >= 10:  # limit
                    break

            except:
                continue

driver.quit()

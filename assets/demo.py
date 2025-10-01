import json

with open("old.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# 取出所有 chapter_index 的唯一值
chapters = set(item["chapter_index"] for item in data)
print("总共有多少章:", len(chapters))

import imagehash

def old_hamming_sim(hash1: str, hash2: str) -> float:
    h1 = imagehash.hex_to_hash(hash1)
    h2 = imagehash.hex_to_hash(hash2)
    dist = h1 - h2
    max_dist = h1.hash.size
    sim = 1.0 - (dist / max_dist)
    return sim

def new_hamming_sim(hash1: str, hash2: str) -> float:
    h1 = imagehash.hex_to_hash(hash1)
    h2 = imagehash.hex_to_hash(hash2)
    dist = h1 - h2
    max_dist = h1.hash.size
    threshold = max_dist / 2.0
    sim = 1.0 - (dist / threshold)
    return max(0.0, sim)

# Two random completely different hashes
h1 = "fffffefad2d2d2d2"
h2 = "3f93f3ed8383818b"

print("Old random:", old_hamming_sim(h1, h2))
print("New random:", new_hamming_sim(h1, h2))

# Similar hashes (e.g. 5 bits diff)
# Let's say h1 and a slight variation
h3 = "fffffeead2d2d2d2"
print("Old similar:", old_hamming_sim(h1, h3))
print("New similar:", new_hamming_sim(h1, h3))

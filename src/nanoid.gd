class_name NanoID

const ALPHABET := "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_"


static func generate(size: int = 21) -> String:
	var result := ""

	for i in size:
		result += ALPHABET[crypto_random_int(0, ALPHABET.length())]

	return result


static func crypto_random_int(min_value: int, max_value: int) -> int:
	var crypto := Crypto.new()
	var bytes := crypto.generate_random_bytes(4)

	var value: int = (
		(int(bytes[0]) << 24) | (int(bytes[1]) << 16) | (int(bytes[2]) << 8) | int(bytes[3])
	) & 0x7fffffff

	return min_value + (value % (max_value - min_value))

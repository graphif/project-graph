#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct SentencePieceProcessor SentencePieceProcessor;

typedef struct SentencePieceText SentencePieceText;

int spp_decode_piece_ids(SentencePieceProcessor *spp, uint32_t const *pieces, size_t pieces_len, unsigned char **decoded, size_t *decoded_len);

int spp_decode_pieces(SentencePieceProcessor *spp, char const * const *pieces, size_t pieces_len, unsigned char **decoded, size_t *decoded_len);

unsigned char *spp_encode_as_serialized_proto(SentencePieceProcessor *spp, char const *sentence, size_t sentence_len, size_t *len);

unsigned char *spp_sample_encode_as_serialized_proto(SentencePieceProcessor *spp, char const *sentence, size_t sentence_len, size_t *len, size_t nbest, float alpha);

SentencePieceProcessor *spp_new();

int spp_from_serialized_proto(SentencePieceProcessor *spp, char const *data, size_t len);

unsigned char *spp_to_serialized_proto(SentencePieceProcessor *spp, size_t *len);

int spp_load(SentencePieceProcessor *spp, char const *filename);

void spp_free(SentencePieceProcessor *spp);

int spp_bos_id(SentencePieceProcessor *spp);

int spp_eos_id(SentencePieceProcessor *spp);

bool spp_is_unknown(SentencePieceProcessor *spp, int id);

int spp_pad_id(SentencePieceProcessor *spp);

int spp_piece_to_id(SentencePieceProcessor *spp, char const *piece);

int spp_piece_size(SentencePieceProcessor *spp);

int spp_unk_id(SentencePieceProcessor *spp);

int spp_normalize(SentencePieceProcessor *spp, char const *sentence, size_t sentence_len, unsigned char **normalized, size_t *normalized_len);

#ifdef __cplusplus
}
#endif

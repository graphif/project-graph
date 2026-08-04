#include <cstdint>
#include <cstdlib>
#include <cstring>
#include <type_traits>
#include <vector>

#include <sentencepiece_processor.h>

using absl::string_view;
using sentencepiece::SentencePieceProcessor;
using sentencepiece::SentencePieceText;

// Inspired by:
// https://stackoverflow.com/a/14589519
template<typename E>
constexpr auto to_underlying_type(E e) -> typename std::underlying_type<E>::type 
{
   return static_cast<typename std::underlying_type<E>::type>(e);
}

extern "C" {

SentencePieceProcessor *spp_new() {
  return new SentencePieceProcessor();
}

int spp_bos_id(SentencePieceProcessor *spp) {
  return spp->bos_id();
}

int spp_decode_piece_ids(SentencePieceProcessor *spp, uint32_t const *pieces, size_t pieces_len, unsigned char **decoded, size_t *decoded_len) {
    std::vector<int> int_pieces;
    int_pieces.reserve(pieces_len);

    for (uint32_t const *piece = pieces; piece != pieces + pieces_len; ++piece) {
        int_pieces.push_back(static_cast<int>(*piece));
    }

    std::string decoded_string;
    auto status = spp->Decode(int_pieces, &decoded_string);

    *decoded_len = decoded_string.size();
    *decoded = static_cast<unsigned char *>(malloc(decoded_string.size()));
    memcpy(*decoded, decoded_string.data(), decoded_string.size());

    return to_underlying_type(status.code());
}

int spp_decode_pieces(SentencePieceProcessor *spp, char const * const *pieces, size_t pieces_len, unsigned char **decoded, size_t *decoded_len) {
    std::vector<absl::string_view> str_pieces;
    str_pieces.reserve(pieces_len);
  
    for (char const * const *piece = pieces; piece != pieces + pieces_len; ++piece) {
        str_pieces.push_back(*piece);
    }

    std::string decoded_string;
    auto status = spp->Decode(str_pieces, &decoded_string);

    *decoded_len = decoded_string.size();
    *decoded = static_cast<unsigned char *>(malloc(decoded_string.size()));
    memcpy(*decoded, decoded_string.data(), decoded_string.size());

    return to_underlying_type(status.code());
}

unsigned char *spp_encode_as_serialized_proto(SentencePieceProcessor *spp, char const *sentence, size_t sentence_len, size_t *len) {
  auto sentence_view = absl::string_view(sentence, sentence_len);
  auto serialized = spp->EncodeAsSerializedProto(sentence_view);

  *len = serialized.size();
  unsigned char *data = (unsigned char *) malloc(serialized.size());
  memcpy(data, serialized.data(), serialized.size());

  return data;
}

unsigned char *spp_sample_encode_as_serialized_proto(SentencePieceProcessor *spp, char const *sentence, size_t sentence_len, size_t *len, size_t nbest, float alpha) {
  auto sentence_view = absl::string_view(sentence, sentence_len);
  auto serialized = spp->SampleEncodeAsSerializedProto(sentence_view, static_cast<int>(nbest), alpha);

  *len = serialized.size();
  unsigned char *data = (unsigned char *) malloc(serialized.size());
  memcpy(data, serialized.data(), serialized.size());

  return data;
}

int spp_normalize(SentencePieceProcessor *spp, char const *sentence, size_t sentence_len, unsigned char **normalized, size_t *normalized_len) {
  auto sentence_view = absl::string_view(sentence, sentence_len);
  std::string normalized_str;
  auto status = spp->Normalize(sentence_view, &normalized_str);

  if (!status.ok()) {
    *normalized = nullptr;
    *normalized_len = 0;
    return to_underlying_type(status.code());
  }

  *normalized_len = normalized_str.size();
  *normalized = (unsigned char *) malloc(normalized_str.size());
  memcpy(*normalized, normalized_str.data(), normalized_str.size());

  return to_underlying_type(status.code());
}

int spp_normalize_with_offsets(SentencePieceProcessor *spp, char const *sentence, size_t sentence_len, unsigned char **normalized, size_t *normalized_len, size_t **offsets, size_t *offsets_len) {
  auto sentence_view = absl::string_view(sentence, sentence_len);
  std::string normalized_str;
  std::vector<size_t> norm_to_orig_vec;
  auto status = spp->Normalize(sentence_view, &normalized_str, &norm_to_orig_vec);

  if (!status.ok()) {
    *normalized = nullptr;
    *normalized_len = 0;
    *offsets = nullptr;
    *offsets_len = 0;
    return to_underlying_type(status.code());
  }

  // Allocate and copy normalized string
  *normalized_len = normalized_str.size();
  *normalized = (unsigned char *) malloc(normalized_str.size());
   if (*normalized == nullptr && normalized_str.size() > 0) {
      // Allocation failed
      *normalized_len = 0;
      *offsets = nullptr;
      *offsets_len = 0;
      return to_underlying_type(sentencepiece::util::StatusCode::kResourceExhausted);
  }
  memcpy(*normalized, normalized_str.data(), normalized_str.size());

  // Allocate and copy offsets
  *offsets_len = norm_to_orig_vec.size();
  *offsets = (size_t *) malloc(norm_to_orig_vec.size() * sizeof(size_t));
  if (*offsets == nullptr && norm_to_orig_vec.size() > 0) {
      // Allocation failed - free the already allocated normalized string
      free(*normalized);
      *normalized = nullptr;
      *normalized_len = 0;
      *offsets_len = 0;
      return to_underlying_type(sentencepiece::util::StatusCode::kResourceExhausted);
  }
  memcpy(*offsets, norm_to_orig_vec.data(), norm_to_orig_vec.size() * sizeof(size_t));

  return to_underlying_type(status.code());
}

int spp_eos_id(SentencePieceProcessor *spp) {
  return spp->eos_id();
}

int spp_load(SentencePieceProcessor *spp, char const *filename) {
  auto status = spp->Load(filename);
  return to_underlying_type(status.code());
}

bool spp_is_unknown(SentencePieceProcessor *spp, int id) {
  return spp->IsUnknown(id);
}

int spp_pad_id(SentencePieceProcessor *spp) {
  return spp->pad_id();
}

int spp_piece_size(SentencePieceProcessor *spp) {
  return spp->GetPieceSize();
}

int spp_piece_to_id(SentencePieceProcessor *spp, char const *piece) {
  return spp->PieceToId(piece);
}

int spp_from_serialized_proto(SentencePieceProcessor *spp, char const *data, size_t len) {
  auto status = spp->LoadFromSerializedProto(string_view(data, len));
  return to_underlying_type(status.code());
}

unsigned char *spp_to_serialized_proto(SentencePieceProcessor *spp, size_t *len) {
  auto serialized = spp->serialized_model_proto();

  *len = serialized.size();
  unsigned char *data = (unsigned char *) malloc(serialized.size());
  memcpy(data, serialized.data(), serialized.size());

  return data;
}

void spp_free(SentencePieceProcessor *spp) {
  delete spp;
}

int spp_unk_id(SentencePieceProcessor *spp) {
  return spp->unk_id();
}

}

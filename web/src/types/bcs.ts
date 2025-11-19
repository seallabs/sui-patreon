import { bcs } from "@mysten/sui/bcs";

export const bcsCreatorInfo = bcs.struct('CreatorInfo', {
    bio: bcs.String,
    avatarBlobId: bcs.String,
    coverImageBlobId: bcs.String,
    isVerified: bcs.Bool,
})
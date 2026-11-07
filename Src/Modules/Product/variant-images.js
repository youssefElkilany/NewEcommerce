import cloudinary from '../../Utills/Cloudinary.js';

const invalid = (message, cause = 400) => new Error(message, {cause});
const metadata = image => ({public_id:image.public_id, secure_url:image.secure_url});

// Resolve IDs against this owned product, never against client-supplied URLs.
// On update an explicit selection replaces the gallery; uploads alone append.
export async function resolveVariantImages(product, body, files = {}, current) {
    const catalog = new Map(product.variants.flatMap(variant =>
        [variant.mainImage, ...(variant.subImages || [])]
    ).filter(image => image?.public_id && image?.secure_url)
      .map(image => [image.public_id, metadata(image)]));

    const mainFiles = files.mainImage || [];
    const extraFiles = files.subImages || [];

    if(body.mainImagePublicId !== undefined && mainFiles.length)
        throw invalid('Choose an existing main image or upload one, not both');

    // user must upload main image
    if(!current && !body.mainImagePublicId && !mainFiles.length)
        throw invalid('A main image is required');

    const choose = publicId => {
        const image = catalog.get(publicId);
        if(!image) throw invalid('Selected image was not found in this product', 404);
        return image;
    };
    // check that publicId found in other variants
    let mainImage = body.mainImagePublicId === undefined ? undefined : choose(body.mainImagePublicId);
    let selected;

    if(body.subImagesPublicIds !== undefined) {
        try { selected = JSON.parse(body.subImagesPublicIds); }
        catch { throw invalid('Sub-image selection must be a JSON array'); }
        if(!Array.isArray(selected) || selected.some(id => typeof id !== 'string' || !id.trim()) ||
           new Set(selected).size !== selected.length)
            throw invalid('Choose unique sub-image IDs');
    }

    const subImages = selected === undefined
        ? (current?.subImages || []).map(metadata)
        : selected.map(choose);

    if(subImages.length + extraFiles.length > 4)
        throw invalid('A variant can have at most four additional images');

    // All ownership, reference and count checks finish before any upload starts.
    const folder = `${process.env.APP}/product/${product.cloudId}`;
    const [uploadedMain, uploadedExtras] = await Promise.all([
        mainFiles.length ? cloudinary.uploader.upload(mainFiles[0].path, {folder}) : null,
        Promise.all(extraFiles.map(image => cloudinary.uploader.upload(image.path, {folder:`${folder}/subImages`})))
    ]);

    if(uploadedMain) mainImage = metadata(uploadedMain);
    const result = {};

    if(mainImage) result.mainImage = mainImage;
    if(!current || selected !== undefined || extraFiles.length)
        result.subImages = [...subImages, ...uploadedExtras.map(metadata)];
    return result;
}

// Called only after a successful save; shared assets remain available to siblings.
export async function releaseUnreferencedImages(previousVariant, updatedProduct) {
    if(!updatedProduct?.variants) return;

    const referenced = new Set(updatedProduct.variants.flatMap(variant =>
        [variant.mainImage, ...(variant.subImages || [])]
    ).map(image => image?.public_id).filter(Boolean));

    const previous = new Set([previousVariant.mainImage, ...(previousVariant.subImages || [])]
        .map(image => image?.public_id).filter(Boolean));
    await Promise.allSettled([...previous].filter(id => !referenced.has(id))
        .map(id => cloudinary.uploader.destroy(id)));
}

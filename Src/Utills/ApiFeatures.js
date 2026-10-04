

 class ApiFeatures {
    constructor(queryData , mongooseQuery) {
        this.mongooseQuery = mongooseQuery
        this.queryData =  queryData
    }

    paginate()
    {
         const requestedPage = Number(this.queryData?.page);
         const requestedSize = Number(this.queryData?.size);

         // validate that it must be integer and positive number else default
    const page =
        Number.isSafeInteger(requestedPage) && requestedPage > 0
            ? requestedPage
            : 1

    const size =
        Number.isSafeInteger(requestedSize) && requestedSize > 0
            ? Math.min(requestedSize, 100)
            : 3

        const skip = (page-1)*size
        this.mongooseQuery.skip(parseInt(skip)).limit(parseInt(size))
        return this
    }

    filter()
    {
        // const filters = {}
        // if (this.queryData.brandId) filters.brandId = this.queryData.brandId
        // if (this.queryData.subCategoryId) filters.subCategoryId = this.queryData.subCategoryId
        // this.mongooseQuery.find(filters)

         // ana mmkn a7ot 7aget filter gowaha b3deha a5ot filter bas mn 8eer delete ba2y el7aga
        const excludedQuery = ['sort' , 'search' , 'select' , 'fields' , "page" , "size","isDeleted","createdBy","updatedBy","createdAt","updatedAt","__v"]
        const filteredQuery = {...this.queryData}
        excludedQuery.forEach(query=>{
            delete filteredQuery[query]
        })
        let variantsFilter = {}  // price , stock , options , discount -> specific variants
        // variantsFilter.isActive = true
        variantsFilter.stock = { $gt: 0 } // default filter to get only active variants with stock > 0

         if(this.queryData.minPrice && this.queryData.maxPrice)
        {
            if(Number(this.queryData.minPrice) > Number(this.queryData.maxPrice))
            {
                throw new Error("minPrice cannot be greater than maxPrice")
            }
            variantsFilter.finalPrice = { $gte: Number(this.queryData.minPrice),
                $lte: Number(this.queryData.maxPrice)
            }
        }
        else{
             if(this.queryData?.minPrice)
        {
            variantsFilter.finalPrice = { $gte: Number(this.queryData.minPrice) }
        }
        if(this.queryData?.maxPrice)
        {
            // Issue: this replaces the minPrice condition when both bounds are supplied.
            // To keep both bounds later, merge $lte into variantsFilter.finalPrice.
            variantsFilter.finalPrice = { $lte: Number(this.queryData.maxPrice) }
        }
        }
       
         this.mongooseQuery.find({variants:{$elemMatch:variantsFilter}}).select({
    name: 1,
    description: 1,
    // Include any other product fields you want returned.
    variants: {
        $filter: {
            input: '$variants',
            as: 'variant',
            cond: {
                $and: [
                    // { $gt: ['$$variant.stock', 0] },
                    // { $gte: ['$$variant.finalPrice', 100] },
                    // { $lte: ['$$variant.finalPrice', 500] }
                    variantsFilter.finalPrice ? { $gte: ['$$variant.finalPrice', variantsFilter.finalPrice.$gte || 0] } : {},
                    variantsFilter.finalPrice ? { $lte: ['$$variant.finalPrice', variantsFilter.finalPrice.$lte || Infinity] } : {},
                    variantsFilter.stock ? { $gt: ['$$variant.stock', variantsFilter.stock.$gt || 0] } : {}
                ]
            }
        }
    }
})
        // Save the same conditions for trimming the returned variants array.
        this.variantsFilter = variantsFilter

        console.log({filteredQuery})
        console.log(JSON.parse(JSON.stringify(filteredQuery).replace(/(gt|gte|lt|lte|eq|neq|in|nin)/g,match =>`$${match}`)))
        // Issue: general filters such as brandId/subCategoryId are not applied while this is commented out.
        // The unanchored regex also changes matching text inside keys/values, not just operator names.
        // this.mongooseQuery?.find(JSON.parse(JSON.stringify(filteredQuery).replace(/(gt|gte|lt|lte|eq|neq|in|nin)/g,match =>`$${match}`)))


        return this
    }

    selectVariants()
    {
        // Respect a fields selection that omits variants.
        const fields = this.queryData?.fields?.split(',')
        if (fields && !fields.includes('variants')) return this
        if (!this.variantsFilter) return this

        const conditions = Object.entries(this.variantsFilter).flatMap(([field, comparisons]) =>
            Object.entries(comparisons).map(([operator, value]) => ({
                [operator]: [`$$variant.${field}`, {$literal:value}]
            }))
        )
        const matchingVariants = {
            $filter: {
                input: '$variants',
                as: 'variant',
                cond: {$and:conditions}
            }
        }

        const hasVariantFilter = this.queryData.minPrice !== undefined ||
            this.queryData.maxPrice !== undefined

        // Computed projection changes only the response, not the stored product.
        // Include product fields too: a computed projection otherwise returns only _id and variants.
        if (!fields) {
            const productFields = Object.keys(this.mongooseQuery.model.schema.paths)
                .map(path => path.split('.')[0])
                .filter(path => path !== 'variants')
            this.mongooseQuery.select(Object.fromEntries(productFields.map(path => [path, 1])))
        }
        this.mongooseQuery.select({
            variants: hasVariantFilter ? matchingVariants : {$slice:[matchingVariants, 1]}
        })
        return this
    }
    
    sort()
    {
       const sort = this.queryData?.sort;

    this.mongooseQuery.sort(
        typeof sort === 'string' && sort.trim()
            ? sort.replaceAll(',', ' ')
            : { createdAt: -1, _id: -1 } // newest products first
    );
        return this
    }

    search(){ 

         const search = this.queryData?.search;

    if (typeof search !== 'string' || !search.trim()) {
        return this;
    }
        const literalSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        this.mongooseQuery.find({
            $or:[
                {name:{$regex:literalSearch,$options:'i'}},
                {description:{$regex:literalSearch,$options:'i'}}
            ]}
        )
        return this
    }

    select(){

        if (this.queryData?.fields) {
            this.mongooseQuery.select(this.queryData.fields.replaceAll(',',' '))
        }
        return this
    }
}

export default ApiFeatures

// -------> search by name or description , filter using -> minPrice -> finalPrice field , maxPrice -> finalPrice field , discount , rating , options but later
// 1- when user use filter make only matched variants appear like a single product
// 2- when user search to get matched product or get all products just get first variant from product that stock greater than 0 , variant is active with bigger discount
// ----------> by aggregation

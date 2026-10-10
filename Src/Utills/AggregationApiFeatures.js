import { Types } from 'mongoose'

const publicFields = new Set([
    '_id', 'name', 'description', 'slug', 'specifications', 'brandId',
    'subCategoryId', 'categoryId', 'variants', 'ratings', 'createdAt', 'updatedAt'
])
const sortFields = new Set([
    '_id', 'name', 'createdAt', 'updatedAt', 'ratings.average',
    'variants.finalPrice', 'variants.discount', 'variants.stock'
])
const aliases = { finalPrice: 'variants.finalPrice', discount: 'variants.discount', rating: 'ratings.average' }

const badRequest = message => new Error(message, { cause: 400 })

// can be validated using joi
function numberFilter(value, name, maximum = Infinity) {
    if ((typeof value !== 'string' && typeof value !== 'number') ||
        String(value).trim() === '' || !Number.isFinite(Number(value)) ||
        Number(value) < 0 || Number(value) > maximum) {
        throw badRequest(`${name} must be a number between 0 and ${maximum}`)
    }
    return Number(value)
}

// Pass a fresh Product.aggregate(). Feature stages are assembled in database order,
// regardless of the order in which the chainable methods are called.
export default class AggregationApiFeatures {
    constructor(queryData = {}, mongooseQuery) {
        this.queryData = queryData
        this.aggregate = mongooseQuery
        this.productMatch = {}
        this.variantMatch = []
        this.hasFilter = false
        this.searchMatch = {}
        this.sortStage = { createdAt: -1, _id: -1 }
    }

    filter() {
        this.productMatch = {}
        this.variantMatch = []
        this.hasFilter = false
        // An allowlist prevents excluded fields and MongoDB operators from
        // overriding isDeleted, isActive, or stock. Options are deferred.
        for (const field of ['brandId', 'subCategoryId', 'categoryId']) {
            const value = this.queryData[field]
            if (value === undefined) continue
            const isMultiple = field === 'subCategoryId' && Array.isArray(value)
            const values = isMultiple ? value : [value]
            if (!values.length || values.some(id => typeof id !== 'string' || !/^[a-f\d]{24}$/i.test(id))) {
                throw badRequest(`${field} must be ${field === 'subCategoryId' ? 'a valid ObjectId or a non-empty array of ObjectIds' : 'a valid ObjectId'}`)
            }
            // Aggregation does not cast IDs as find() does.
            const ids = values.map(id => new Types.ObjectId(id))
            // Repeated query keys select products from any of these subcategories.
            this.productMatch[field] = isMultiple ? { $in: ids } : ids[0]
            this.hasFilter = true
        }

        const min = this.queryData.minPrice === undefined ? undefined : numberFilter(this.queryData.minPrice, 'minPrice')
        const max = this.queryData.maxPrice === undefined ? undefined : numberFilter(this.queryData.maxPrice, 'maxPrice')
        if (min !== undefined && max !== undefined && min > max) {
            throw badRequest('minPrice cannot be greater than maxPrice')
        }
        if (min !== undefined) this.variantMatch.push({ $gte: ['$$variant.finalPrice', min] })
        if (max !== undefined) this.variantMatch.push({ $lte: ['$$variant.finalPrice', max] })
        // Plain discount and rating values are exact matches.
        if (this.queryData.discount !== undefined) {
            this.variantMatch.push({ $eq: [
                { $ifNull: ['$$variant.discount', 0] },
                numberFilter(this.queryData.discount, 'discount', 100)
            ] })
        }
        if (this.queryData.rating !== undefined) {
            this.productMatch['ratings.average'] = numberFilter(this.queryData.rating, 'rating', 5)
            this.hasFilter = true
        }
        this.hasFilter ||= this.variantMatch.length > 0
        return this
    }

    search() {
        this.searchMatch = {}
        const search = this.queryData.search
        if (typeof search === 'string' && search.trim()) {
            const literal = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            this.searchMatch.$or = ['name', 'description'].map(field => ({
                [field]: { $regex: literal, $options: 'i' }
            }))
        }
        return this
    }

    selectVariants() {
        // Variant selection is mandatory in pipeline, even when this is omitted.
        return this
    }

    sort() {
        const sort = this.queryData.sort
        if (typeof sort !== 'string' || !sort.trim()) return this
        this.sortStage = {}
        for (const token of sort.trim().split(/[,\s]+/)) {
            const name = token.replace(/^-/, '')
            const field = Object.hasOwn(aliases, name) ? aliases[name] : name
            if (!sortFields.has(field)) throw badRequest(`Unsupported sort field: ${name}`)
            this.sortStage[field] = token.startsWith('-') ? -1 : 1
        }
        this.sortStage._id ??= -1
        return this
    }

    paginate() {
        const requestedPage = Number(this.queryData.page)
        const requestedSize = Number(this.queryData.size)
        const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
        const size = Number.isSafeInteger(requestedSize) && requestedSize > 0 ? Math.min(requestedSize, 100) : 3
        const skip = (page - 1) * size
        if (!Number.isSafeInteger(skip)) throw badRequest('Requested page is too large')
        this.pagination = [{ $skip: skip }, { $limit: size }]
        return this
    }

    select() {
        const fields = this.queryData.fields ?? this.queryData.select
        if (typeof fields !== 'string' || !fields.trim()) return this
        const projection = {}
        for (const token of fields.trim().split(/[,\s]+/)) {
            const name = token.replace(/^-/, '')
            if (!publicFields.has(name)) throw badRequest(`Unsupported selection field: ${name}`)
            projection[name] = token.startsWith('-') ? 0 : 1
        }
        const modes = new Set(Object.entries(projection).filter(([key]) => key !== '_id').map(([, value]) => value))
        if (modes.size > 1) throw badRequest('Cannot mix included and excluded fields (except _id)')
        this.projection = projection
        return this
    }

    get pipeline() {
        const pipeline = [
            { $match: { ...this.productMatch, ...this.searchMatch, isDeleted: false } },
            { $set: { variants: { $filter: {
                input: { $ifNull: ['$variants', []] }, as: 'variant',
                cond: { $and: [
                    // Aggregation does not apply Mongoose defaults to old records.
                    // Missing means the schema default (true); false/null stay excluded.
                    { $or: [
                        { $eq: ['$$variant.isActive', true] },
                        { $eq: [{ $type: '$$variant.isActive' }, 'missing'] }
                    ] },
                    { $gt: ['$$variant.stock', 0] },
                    ...this.variantMatch
                ] }
            } } } },
            { $match: { 'variants.0': { $exists: true } } }
        ]
        if (this.hasFilter) {
            // One product entry per match, retaining the existing variants array shape.
            pipeline.push({ $unwind: '$variants' }, { $set: { variants: ['$variants'] } })
        } else {
            // Strictly greater keeps the first variant when discounts are tied.
            pipeline.push({ $set: { variants: [{ $reduce: {
                input: '$variants', initialValue: null,
                in: { $cond: [
                    { $or: [
                        { $eq: ['$$value', null] },
                        { $gt: [{ $ifNull: ['$$this.discount', 0] }, { $ifNull: ['$$value.discount', 0] }] }
                    ] }, '$$this', '$$value'
                ] }
            } }] } })
        }
        pipeline.push({ $sort: { ...this.sortStage, 'variants._id': 1 } })
        if (this.pagination) pipeline.push(...this.pagination)
        // if (this.projection) pipeline.push({ $project: this.projection })
        return pipeline
    }

    get catalogPipeline() {
        // Count matching available variants before pagination, only when requested.
        const stages = this.pipeline
        const sortIndex = stages.findIndex(stage => stage.$sort)
        return [
            ...stages.slice(0, sortIndex),
            { $facet: {
                products: stages.slice(sortIndex),
                totals: [{ $count: 'totalItems' }]
            } }
        ]
    }

    get mongooseQuery() {
        // Re-reading this property must not append duplicate stages.
        return this.aggregate.model().aggregate([...this.aggregate.pipeline(), ...this.pipeline])
    }
}

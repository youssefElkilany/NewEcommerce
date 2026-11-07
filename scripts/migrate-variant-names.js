import mongoose from 'mongoose'
import { pathToFileURL } from 'node:url'

export function migrateProductNames(product) {
    const variants = (product.variants || []).map(variant => {
        const name = typeof variant.name === 'string' && variant.name.trim()
            ? variant.name.trim()
            : typeof product.name === 'string' ? product.name.trim() : ''
        if (!name) throw new Error(`Product ${product._id}: variant ${variant._id} has no name to migrate`)
        return {...variant, name}
    })
    const {name, ...rest} = product
    return {...rest, variants}
}

async function main() {
    if (!process.env.DB_ATLAS) throw new Error('DB_ATLAS is required')
    await mongoose.connect(process.env.DB_ATLAS, {serverSelectionTimeoutMS:5000})
    try {
        const products = mongoose.connection.collection('products')
        let pending = 0
        // Preflight all records before writing anything.
        for await (const product of products.find({})) {
            const migrated = migrateProductNames(product)
            if (Object.hasOwn(product, 'name') || JSON.stringify(product.variants) !== JSON.stringify(migrated.variants)) pending++
        }
        console.log(`${pending} products need migration`)
        if (!process.argv.includes('--apply')) {
            console.log('Dry run only. Add --apply to copy legacy names into variants and remove product.name.')
            return
        }
        let modified = 0
        for await (const product of products.find({})) {
            const migrated = migrateProductNames(product)
            if (!Object.hasOwn(product, 'name') && JSON.stringify(product.variants) === JSON.stringify(migrated.variants)) continue
            // Refuse to overwrite concurrent changes to names or variants.
            const result = await products.updateOne({
                _id:product._id,
                name:Object.hasOwn(product, 'name') ? {$eq:product.name} : {$exists:false},
                variants:product.variants === undefined ? {$exists:false} : {$eq:product.variants}
            }, {$set:{variants:migrated.variants}, $unset:{name:''}})
            if (!result.matchedCount) throw new Error(`Product ${product._id} changed during migration; rerun after stopping writes`)
            modified += result.modifiedCount
        }
        console.log(`Migrated ${modified} products`)
    } finally {
        await mongoose.disconnect()
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main().catch(error => {
        // Connection errors can contain connection details; do not print credentials.
        console.error(error.message.startsWith('Product ') ? error.message : 'Migration failed; check DB_ATLAS and database access.')
        process.exitCode = 1
    })
}

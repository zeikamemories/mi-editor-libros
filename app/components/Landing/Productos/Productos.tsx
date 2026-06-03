import ProductCard from './ProductCard'
import './Productos.css'

const PRODUCTS = [
  { sizeId: 'chico',    name: 'Chico Horizontal',  price: '$75.000',  dimensions: '21 x 14,8 cm' },
  { sizeId: 'mediano',  name: 'Mediano Horizontal', price: '$81.500',  dimensions: '28 x 21,6 cm' },
  { sizeId: 'grande',   name: 'Grande Horizontal',  price: '$100.000', dimensions: '41 x 29 cm'   },
  { sizeId: 'vertical', name: 'Vertical',           price: '$81.500',  dimensions: '28 x 21,6 cm' },
  { sizeId: 'cuadrado', name: 'Cuadrado',           price: '$97.000',  dimensions: '29 x 29 cm'   },
]

export default function Productos() {
  return (
    <section className="productos">
      <div className="productos__header">
        <p className="productos__label">Nuestros Productos</p>
        <button className="productos__comparar">Comparar tamaños</button>
      </div>
      <div className="productos__grid">
        {PRODUCTS.map(p => (
          <ProductCard key={p.sizeId} {...p} />
        ))}
      </div>
    </section>
  )
}

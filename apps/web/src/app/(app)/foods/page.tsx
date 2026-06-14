import { getCustomFoods } from '@/lib/data/queries';
import { FoodsManager } from './foods-manager';

export const dynamic = 'force-dynamic';

export default async function FoodsPage() {
  const foods = await getCustomFoods();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 22, letterSpacing: '-0.02em' }}>My Foods</h1>
        <p className="muted" style={{ margin: '4px 0 0', fontSize: 14 }}>
          Save foods once, then log them in a tap. Nutrition is stored per 100 g.
        </p>
      </div>
      <FoodsManager foods={foods} />
    </div>
  );
}

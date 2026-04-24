# Модель данных и серверная логика

## Таблицы

### `profiles`

Хранит бизнес-профиль пользователя поверх `auth.users`.

Поля:

- `id`
- `email`
- `full_name`
- `role`
- `is_active`
- `created_at`
- `updated_at`
- `archived_at`

### `warehouses`

Справочник складов.

Поля:

- `id`
- `name`
- `description`
- `is_active`
- `created_at`
- `updated_at`
- `archived_at`

### `item_categories`

Справочник категорий товаров.

### `items`

Карточка товара.

Ключевые поля:

- `category_id`
- `name`
- `model`
- `sku`
- `description`
- `specs_json`
- `purchase_price`
- `sale_price`
- `image_url`
- `is_active`

### `inventory_balances`

Остатки по схеме `склад + товар`.

Особенности:

- одна запись на пару `warehouse_id + item_id`;
- `quantity >= 0`;
- прямое чтение разрешено, запись напрямую не используется в приложении.

### `inventory_operations`

Журнал движений товара.

Поля:

- `type`
- `item_id`
- `source_warehouse_id`
- `destination_warehouse_id`
- `quantity`
- `comment`
- `created_by_user_id`
- `created_at`

## Связи

- `profiles.id -> auth.users.id`
- `items.category_id -> item_categories.id`
- `inventory_balances.warehouse_id -> warehouses.id`
- `inventory_balances.item_id -> items.id`
- `inventory_operations.item_id -> items.id`
- `inventory_operations.source_warehouse_id -> warehouses.id`
- `inventory_operations.destination_warehouse_id -> warehouses.id`
- `inventory_operations.created_by_user_id -> profiles.id`

## Серверные правила учета

### `create_receipt`

Назначение:

- увеличить остатки на складе;
- создать журнал операций по каждой строке прихода.

Правила:

- доступно только `warehouse_manager` и `super_admin`;
- склад должен существовать и быть активным;
- товары должны существовать и быть активными;
- количество по каждой строке должно быть больше 0;
- при существующем остатке используется upsert и количество увеличивается.

### `create_sale`

Назначение:

- уменьшить остаток товара на складе;
- записать факт расхода.

Правила:

- доступно только `cashier` и `super_admin`;
- количество должно быть больше 0;
- остаток блокируется через `SELECT ... FOR UPDATE`;
- нельзя списать больше доступного остатка.

### `create_transfer`

Назначение:

- переместить товар между складами атомарно.

Правила:

- доступно только `warehouse_manager` и `super_admin`;
- склады источник и получатель должны отличаться;
- оба склада должны быть активными;
- товар должен быть активным;
- остаток на складе-источнике блокируется;
- сначала уменьшается источник, затем увеличивается получатель;
- операция логируется одной записью типа `transfer`.

## RLS и разграничение доступа

- справочники и пользователи читаются всеми аутентифицированными;
- изменять `profiles` может только `super_admin`;
- изменять `warehouses`, `item_categories`, `items` могут `warehouse_manager` и `super_admin`;
- `inventory_balances` и `inventory_operations` доступны на чтение, но не на прямую запись.

## Edge Functions

### `admin-create-user`

Делает:

- проверяет bearer token;
- проверяет, что текущий пользователь активен и имеет роль `super_admin`;
- создает пользователя в Supabase Auth;
- создает профиль в `profiles`;
- при ошибке откатывает создание auth-пользователя.

### `admin-update-user-password`

Делает:

- проверяет bearer token;
- проверяет роль `super_admin`;
- меняет пароль пользователя через admin API Supabase.

## Storage

Bucket: `item-photos`

Правила:

- чтение публичное;
- запись/изменение/удаление только для аутентифицированных;
- путь ограничен префиксом `items/`;
- дополнительно требуется роль `warehouse_manager` или `super_admin`.

## Кэш и обновление данных

Frontend использует React Query.

После успешной операции с остатками приложение инвалидирует и перезапрашивает:

- склады;
- детали склада;
- остатки склада;
- операции склада;
- товары;
- детали товара;
- остатки товара;
- операции товара;
- историю;
- дашборд.

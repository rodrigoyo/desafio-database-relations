import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    // TODO
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not exists.');
    }

    const productsIds = products.map(e => {
      return { id: e.id };
    });

    const productsFinded = await this.productsRepository.findAllById(
      productsIds,
    );

    if (products.length !== productsFinded.length) {
      throw new AppError('There are invalid products in the order.');
    }

    const productsToUpdateQuantity: IProduct[] = [];
    const productsToOrder = productsFinded.map(product => {
      const quantity = Number(
        products.find(i => i.id === product.id)?.quantity,
      );
      if (product.quantity - quantity < 0) {
        throw new AppError('Insuficient stock');
      }

      productsToUpdateQuantity.push({ id: product.id, quantity });

      return {
        product_id: product.id,
        price: Number(product.price),
        quantity,
      };
    });

    await this.productsRepository.updateQuantity(productsToUpdateQuantity);

    const order = await this.ordersRepository.create({
      customer,
      products: productsToOrder,
    });

    return order;
  }
}

export default CreateOrderService;

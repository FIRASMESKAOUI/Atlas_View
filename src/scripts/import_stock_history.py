from ..services.data_service import DataService

if __name__ == "__main__":
    service = DataService()
    result = service.import_stock_history_from_csv()
    print(result)


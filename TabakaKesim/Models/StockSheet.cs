namespace TabakaKesim.Models;

public class StockSheet // stok kartları
{
    public int Id { get; set; }
    public double Width { get; set; } = 2800; // genislik
    public double Height { get; set; } = 2100;  //yukseklik
    public double KerfSize { get; set; } = 3; // testere payi
}
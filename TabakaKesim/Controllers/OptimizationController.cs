using Microsoft.AspNetCore.Mvc;
using TabakaKesim.Models;
using TabakaKesim.Services;
using System.Linq; // Added for .Any() and .Sum()
using System; // Added for DateTime
using System.Text.Json; // Added for JsonSerializer

namespace TabakaKesim.Controllers;

[ApiController]
[Route("api/[controller]")]
public class OptimizationController : ControllerBase
{
    private readonly TabakaKesim.Data.AppDbContext _context;

    public OptimizationController(TabakaKesim.Data.AppDbContext context)
    {
        _context = context;
    }

    [HttpGet("history")]
    public IActionResult GetHistory()
    {
        var history = _context.History
            .OrderByDescending(x => x.Date)
            .Select(x => new { x.Id, x.Date, x.Summary }) // Lightweight projection
            .ToList();
        return Ok(history);
    }

    [HttpGet("history/{id}")]
    public IActionResult GetHistoryItem(int id)
    {
        var item = _context.History.Find(id);
        if (item == null) return NotFound();
        return Ok(item);
    }

    [HttpDelete("history/{id}")]
    public IActionResult DeleteHistoryItem(int id)
    {
        var item = _context.History.Find(id);
        if (item == null) return NotFound();

        _context.History.Remove(item);
        _context.SaveChanges();
        return Ok();
    }

    [HttpPost("calculate")]
    public IActionResult Calculate([FromBody] OptimizationRequest request)
    {
        // Pass null to skip auto-saving
        return ProcessAndSave(request, null);
    }

    [HttpPost("save")]
    public IActionResult Save([FromBody] SaveRequest saveRequest)
    {
        if (string.IsNullOrWhiteSpace(saveRequest.Name))
            return BadRequest("Kayıt ismi zorunludur.");
            
        return ProcessAndSave(saveRequest.Request, saveRequest.Name);
    }

    private IActionResult ProcessAndSave(OptimizationRequest request, string? summaryTitle)
    {
        // 1. Validate inputs
        if (request == null || request.Parts == null || !request.Parts.Any())
            return BadRequest("Parça listesi boş olamaz.");

        // Expand parts based on count
        var allParts = new List<Part>();
        int currentId = 1;
        foreach (var part in request.Parts)
        {
            for (int i = 0; i < part.Count; i++)
            {
                allParts.Add(new Part
                {
                    Id = currentId++,
                    Width = part.Width,
                    Height = part.Height,
                    Count = 1
                });
            }
        }

        // 2. Perform optimization
        var result = PerformOptimization(allParts, request.Sheet);

        // 3. Save to History (ONLY if summaryTitle is provided)
        if (!string.IsNullOrEmpty(summaryTitle))
        {
            try 
            {
                var jsonOptions = new System.Text.Json.JsonSerializerOptions 
                { 
                    PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase 
                };

                // Use summaryTitle exactly as provided
                var record = new TabakaKesim.Models.CalculationRecord
                {
                    Date = DateTime.Now,
                    Summary = summaryTitle,
                    InputJson = System.Text.Json.JsonSerializer.Serialize(request, jsonOptions),
                    ResultJson = System.Text.Json.JsonSerializer.Serialize(result, jsonOptions)
                };
                _context.History.Add(record);
                _context.SaveChanges();
            }
            catch(Exception ex)
            {
                Console.WriteLine($"History saving failed: {ex.Message}");
            }
        }

        return Ok(result);
    }

    [HttpGet]
    public IActionResult Get()
    {
        var parts = new List<Part>
        {
            new Part { Id = 1, Width = 1000, Height =500 },
            new Part { Id = 2, Width = 500, Height = 500 },
            new Part { Id = 3, Width = 750, Height = 330 }
        };

        var result = PerformOptimization(parts);
        return Ok(result);
    }

    private List<CuttingResult> PerformOptimization(List<Part> parts, StockSheet sheetDefinition = null)
    {
        var results = new List<CuttingResult>();
        
        // 1. Parçaları sırala (Büyükten küçüğe)
        var unplacedParts = parts.OrderByDescending(p => p.Width * p.Height).ToList();

        // Use provided sheet definition or default
        var baseSheet = sheetDefinition ?? new StockSheet { Width = 2800, Height = 2100, KerfSize = 4 };

        int sheetIndex = 1;

        while (unplacedParts.Any())
        {
            var sheet = new StockSheet { Width = baseSheet.Width, Height = baseSheet.Height, KerfSize = baseSheet.KerfSize, Id = sheetIndex };
            var packer = new GuillotinePackerService(sheet.Width, sheet.Height, sheet.KerfSize);
            
            var currentResult = new CuttingResult
            {
                Sheet = sheet
            };

            // Başlangıç Adımı
            currentResult.Steps.Add(new CutStep 
            { 
                StepNumber = 1, 
                Description = $"Tabaka {sheetIndex}: Başlangıç, ham plaka tezgaha kondu.", 
                Axis = null, 
                CutValue = 0 
            });

            int stepCounter = 2;
            var nextUnplaced = new List<Part>();

            // Mevcut tabakaya sığdırmayı dene
            foreach (var part in unplacedParts)
            {
                var node = packer.Insert(part.Width, part.Height);
                if (node != null)
                {
                    currentResult.Steps.Add(new CutStep
                    {
                        StepNumber = stepCounter,
                        Description = $"Parça {part.Id} ({part.Width}x{part.Height}) yerleştirildi.",
                        Axis = "x", 
                        CutValue = node.X + part.Width 
                    });

                    currentResult.Layout.Add(new PlacedPart
                    {
                        PartId = part.Id,
                        X = node.X,
                        Y = node.Y,
                        W = node.Width,
                        H = node.Height,
                        FinishedAtStep = stepCounter
                    });

                    stepCounter++;
                }
                else
                {
                    nextUnplaced.Add(part);
                }
            }

            // Eğer hiç parça yerleşmediyse ve hala sığmayan parça varsa, sonsuz döngüye girmemek için bu parçayı atlayıp logluyoruz.
            // (Pratikte parça tabakadan büyükse buraya düşer)
            if (unplacedParts.Count == nextUnplaced.Count && unplacedParts.Count > 0)
            {
                Console.WriteLine($"UYARI: {unplacedParts[0].Width}x{unplacedParts[0].Height} boyutundaki parça tabakaya sığmıyor ve atlanıyor.");
                // Atlanan parçayı listeden manuel çıkarıyoruz ki döngü dönebilsin
                nextUnplaced.RemoveAt(0);
            }

            results.Add(currentResult);
            unplacedParts = nextUnplaced;
            sheetIndex++;
        }

        return results;
    }
}
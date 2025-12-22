using Fjeller.SimpleMapper;
using SimpleLyrics.Contracts.DataObjects;
using SimpleLyrics.Data.SqlServer.DataAccess.Entities;

namespace SimpleLyrics.Data.SqlServer.Mapping;

/// ==============================================================================================================================
/// <summary>
/// Defines the object mapping configuration for data layer entities.
/// </summary>
/// ==============================================================================================================================
public class DataMappingProfile : MappingProfile
{
	/// ==============================================================================================================================
	/// <summary>
	/// Initializes a new instance of the <see cref="DataMappingProfile"/> class.
	/// </summary>
	/// ==============================================================================================================================
	public DataMappingProfile()
	{
		CreateMap<Song, SongData>();
		CreateMap<Song, SongListItemData>();

		CreateMap<SongData, Song>().IgnoreMember( m => m.Id );
	}
}

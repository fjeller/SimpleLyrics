using Fjeller.SimpleMapper;
using SimpleLyrics.Contracts.DataObjects;
using SimpleLyrics.Contracts.Models;
using SimpleLyrics.Contracts.Repositories;
using SimpleLyrics.Contracts.Results;
using SimpleLyrics.Contracts.Services;
using System;
using System.Collections.Generic;
using System.Text;

namespace SimpleLyrics.Core.Services;

public class SongService : ISongService
{
	#region Fields

	private readonly ISongRepository _songRepository;
	private readonly ISimpleMapper _mapper;

	#endregion

	#region Public Methods

	public async Task<List<SongModel>> GetSongsAsync( string? filter )
	{
		IEnumerable<SongData> songs = await _songRepository.GetSongsAsync( filter );
		List<SongModel> result = _mapper.Map<SongModel>( songs ).ToList();

		return result;
	}

	public async Task<SongModel?> GetSong( int songId )
	{
		SongData? currentSong = await _songRepository.GetSongAsync( songId );
		if (currentSong is null )
		{
			return null;
		}

		SongModel? result = _mapper.Map<SongModel>( currentSong );

		return result;
	}

	public async Task<SongResult> StoreSong( SongModel model )
	{
		SongData? data = _mapper.Map<SongData>( model );

		SongResult result = await _songRepository.StoreSongAsync( data );

		return result;
	}

	public async Task<SongResult> DeleteSong( int songId )
	{
		SongResult result = await _songRepository.DeleteSongAsync( songId );

		return result;
	}

	#endregion

	#region Constructors

	public SongService( ISongRepository songRepository, ISimpleMapper mapper )
	{
		_songRepository = songRepository;
		_mapper = mapper;
	}

	#endregion
}
